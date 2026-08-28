"""
UFC ETL Script
==============
Fetches fighter, event, and fight data from authoritative GitHub CSVs
(Greco1899/scrape_ufc_stats) which are built from UFCStats.com.
"""

from __future__ import annotations

import argparse
import asyncio
import collections
import csv
import io
import logging
import re
from datetime import datetime
from typing import Any

import httpx
from sqlalchemy import select

from app.db.models import Event, Fighter
from app.db.session import AsyncSessionLocal
from app.repositories.knowledge_graph_repository import KnowledgeGraphRepository

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("etl")

BASE = "https://raw.githubusercontent.com/Greco1899/scrape_ufc_stats/main"
TOTT_CSV_URL = f"{BASE}/ufc_fighter_tott.csv"
DETAILS_CSV_URL = f"{BASE}/ufc_fighter_details.csv"
RESULTS_CSV_URL = f"{BASE}/ufc_fight_results.csv"
EVENTS_CSV_URL = f"{BASE}/ufc_event_details.csv"
STATS_CSV_URL = f"{BASE}/ufc_fight_stats.csv"


def parse_time_seconds(time_str: str) -> int:
    if not time_str or ":" not in time_str:
        return 0
    m, s = time_str.split(":")
    return int(m) * 60 + int(s)


def parse_height(val: str) -> float | None:
    if not val or val.strip() in ("--", ""):
        return None
    m = re.match(r"(\d+)'\s*(\d+)", val.strip())
    if m:
        feet, inches = int(m.group(1)), int(m.group(2))
        return round((feet * 30.48) + (inches * 2.54), 1)
    return None


def parse_reach(val: str) -> float | None:
    if not val or val.strip() in ("--", ""):
        return None
    m = re.match(r"([\d.]+)", val.strip())
    if m:
        return round(float(m.group(1)) * 2.54, 1)
    return None


def parse_date(val: str) -> datetime | None:
    if not val or val.strip() in ("--", ""):
        return None
    try:
        # Format usually "August 22, 2026"
        return datetime.strptime(val.strip(), "%B %d, %Y")
    except ValueError:
        pass
    try:
        # Try "Aug 02, 1989" (TOTT format)
        return datetime.strptime(val.strip(), "%b %d, %Y")
    except ValueError:
        return None


async def fetch_csv(client: httpx.AsyncClient, url: str) -> list[dict]:
    resp = await client.get(url, timeout=30.0)
    resp.raise_for_status()
    reader = csv.DictReader(io.StringIO(resp.text))
    return list(reader)


async def run_etl(force: bool = False) -> None:
    log.info("Starting UFC ETL from GitHub CSVs...")

    async with httpx.AsyncClient() as client:
        log.info("Downloading CSVs...")
        tott_rows, details_rows, results_rows, events_rows, stats_rows = await asyncio.gather(
            fetch_csv(client, TOTT_CSV_URL),
            fetch_csv(client, DETAILS_CSV_URL),
            fetch_csv(client, RESULTS_CSV_URL),
            fetch_csv(client, EVENTS_CSV_URL),
            fetch_csv(client, STATS_CSV_URL),
        )

    log.info(
        f"Downloaded: {len(tott_rows)} TOTT, {len(details_rows)} details, "
        f"{len(results_rows)} fights, {len(events_rows)} events, {len(stats_rows)} stats rows"
    )

    # 1. Prepare Fighter Records (Wins/Losses)
    records: dict[str, dict[str, int]] = collections.defaultdict(
        lambda: {"wins": 0, "losses": 0, "draws": 0}
    )
    weight_class_map: dict[str, str] = {}

    for row in results_rows:
        bout = row.get("BOUT", "").strip()
        outcome = row.get("OUTCOME", "").strip()
        wc = row.get("WEIGHTCLASS", "").strip()
        if " vs. " in bout and "/" in outcome:
            f1, f2 = [p.strip() for p in bout.split(" vs. ")]
            o1, o2 = [p.strip() for p in outcome.split("/")]
            for f, o in [(f1, o1), (f2, o2)]:
                if o == "W":
                    records[f]["wins"] += 1
                elif o == "L":
                    records[f]["losses"] += 1
                elif o in ("D", "NC"):
                    records[f]["draws"] += 1
                if wc:
                    weight_class_map[f] = wc.replace(" Bout", "").strip()

    name_by_url = {}
    first_by_url = {}
    last_by_url = {}
    nick_by_url = {}
    for r in details_rows:
        u = r.get("URL", "").strip()
        if u:
            first = r.get("FIRST", "").strip()
            last = r.get("LAST", "").strip()
            name_by_url[u] = f"{first} {last}".strip()
            first_by_url[u] = first or None
            last_by_url[u] = last or None
            nick_by_url[u] = r.get("NICKNAME", "").strip() or None

    # 2. Prepare Fight Times
    bout_times: dict[tuple[str, str], float] = {}
    for row in results_rows:
        e = row.get("EVENT", "").strip()
        b = row.get("BOUT", "").strip()
        t = row.get("TIME", "").strip()
        r_str = row.get("ROUND", "").strip()
        if e and b and t and r_str.isdigit():
            round_num = int(r_str)
            bout_times[(e, b)] = (round_num - 1) * 5.0 + parse_time_seconds(t) / 60.0

    # 3. Aggregate Advanced Stats
    stats_by_fighter: dict[str, dict[str, Any]] = collections.defaultdict(
        lambda: {
            "sig_landed": 0,
            "sig_att": 0,
            "sig_abs": 0,
            "sig_def_att": 0,
            "td_landed": 0,
            "td_att": 0,
            "td_abs": 0,
            "td_def_att": 0,
            "sub_att": 0,
            "total_time": 0.0,
        }
    )
    processed_bouts = set()
    round_groups = collections.defaultdict(list)
    for row in stats_rows:
        e = row.get("EVENT", "").strip()
        b = row.get("BOUT", "").strip()
        r = row.get("ROUND", "").strip()
        if e and b:
            round_groups[(e, b, r)].append(row)

    def parse_of(val: str) -> tuple[int, int]:
        if " of " in val:
            p = val.split(" of ")
            if p[0].strip().isdigit() and p[1].strip().isdigit():
                return int(p[0].strip()), int(p[1].strip())
        return 0, 0

    for (e, b, r), rows in round_groups.items():
        if len(rows) != 2:
            continue
        f1, f2 = rows[0], rows[1]
        for f_row, opp_row in [(f1, f2), (f2, f1)]:
            name = f_row.get("FIGHTER", "").strip()
            if not name:
                continue

            sl, sa = parse_of(f_row.get("SIG.STR.", ""))
            osl, osa = parse_of(opp_row.get("SIG.STR.", ""))
            tl, ta = parse_of(f_row.get("TD", ""))
            otl, ota = parse_of(opp_row.get("TD", ""))
            sub_val = f_row.get("SUB.ATT", "0") or "0"
            sub = int(sub_val) if sub_val.isdigit() else 0

            st = stats_by_fighter[name]
            st["sig_landed"] += sl
            st["sig_att"] += sa
            st["sig_abs"] += osl
            st["sig_def_att"] += osa
            st["td_landed"] += tl
            st["td_att"] += ta
            st["td_abs"] += otl
            st["td_def_att"] += ota
            st["sub_att"] += sub

            bout_key = (name, e, b)
            if bout_key not in processed_bouts:
                st["total_time"] += bout_times.get((e, b), 0.0)
                processed_bouts.add(bout_key)

    # Database operations
    async with AsyncSessionLocal() as session:
        repo = KnowledgeGraphRepository(session)

        # Upsert Fighters
        log.info("Upserting fighters...")
        for i, row in enumerate(tott_rows, 1):
            url = row.get("URL", "").strip()
            name = name_by_url.get(url, row.get("FIGHTER", "")).strip()
            if not name:
                continue

            fdata = {
                "name": name,
                "first_name": first_by_url.get(url),
                "last_name": last_by_url.get(url),
                "nickname": nick_by_url.get(url),
                "height_cm": parse_height(row.get("HEIGHT", "")),
                "reach_cm": parse_reach(row.get("REACH", "")),
                "stance": row.get("STANCE", "").strip() or None,
                "date_of_birth": parse_date(row.get("DOB", "")),
                "source": "UFCStats",
                "source_url": url or None,
                "profile_url": url or None,
            }
            
            for k, v in fdata.items():
                if isinstance(v, str) and v.strip() in ("", "--", "N/A", "null", "None"):
                    fdata[k] = None
                    
            rec = records.get(name, {})
            if "wins" in rec:
                fdata["wins"] = rec["wins"]
                fdata["losses"] = rec["losses"]
                fdata["draws"] = rec["draws"]
                fdata["record"] = f"{rec['wins']}-{rec['losses']}-{rec['draws']}"
            if weight_class_map.get(name):
                fdata["weight_class"] = weight_class_map[name]
                fdata["division"] = weight_class_map[name]

            fs = stats_by_fighter.get(name)
            if fs and fs["total_time"] > 0:
                mins = fs["total_time"]
                fdata["slpm"] = round(fs["sig_landed"] / mins, 2)
                fdata["str_acc"] = (
                    round(fs["sig_landed"] / fs["sig_att"] * 100, 2) if fs["sig_att"] > 0 else 0.0
                )
                fdata["sapm"] = round(fs["sig_abs"] / mins, 2)
                fdata["str_def"] = (
                    round((fs["sig_def_att"] - fs["sig_abs"]) / fs["sig_def_att"] * 100, 2)
                    if fs["sig_def_att"] > 0
                    else 0.0
                )
                fdata["td_avg"] = round((fs["td_landed"] / mins) * 15, 2)
                fdata["td_acc"] = (
                    round(fs["td_landed"] / fs["td_att"] * 100, 2) if fs["td_att"] > 0 else 0.0
                )
                fdata["td_def"] = (
                    round((fs["td_def_att"] - fs["td_abs"]) / fs["td_def_att"] * 100, 2)
                    if fs["td_def_att"] > 0
                    else 0.0
                )
                fdata["sub_avg"] = round((fs["sub_att"] / mins) * 15, 2)

            await repo.upsert_fighter(fdata)
            if i % 500 == 0:
                await session.commit()

        await session.commit()

        # Upsert Events
        log.info("Upserting events...")
        for i, row in enumerate(events_rows, 1):
            name = row.get("EVENT", "").strip()
            if not name:
                continue

            edata = {
                "name": name,
                "date": parse_date(row.get("DATE", "")),
                "location": row.get("LOCATION", "").strip() or None,
                "event_url": row.get("URL", "").strip() or None,
                "source": "UFCStats",
                "source_url": row.get("URL", "").strip() or None,
            }
            await repo.upsert_event(edata)
            if i % 100 == 0:
                await session.commit()

        await session.commit()

        # Load ID mappings
        log.info("Loading ID mappings...")
        fighter_ids = {
            r.name: r.id for r in (await session.execute(select(Fighter.name, Fighter.id))).all()
        }
        event_ids = {
            r.name: r.id for r in (await session.execute(select(Event.name, Event.id))).all()
        }

        # Upsert Fights
        log.info("Upserting fights...")
        f_success, f_skipped = 0, 0
        for i, row in enumerate(results_rows, 1):
            event_name = row.get("EVENT", "").strip()
            bout = row.get("BOUT", "").strip()
            outcome = row.get("OUTCOME", "").strip()

            if " vs. " not in bout or "/" not in outcome:
                f_skipped += 1
                continue

            f1_name, f2_name = [p.strip() for p in bout.split(" vs. ")]
            o1, o2 = [p.strip() for p in outcome.split("/")]

            eid = event_ids.get(event_name)
            f1_id = fighter_ids.get(f1_name)
            f2_id = fighter_ids.get(f2_name)

            if not eid or not f1_id or not f2_id:
                f_skipped += 1
                continue

            winner_id = f1_id if o1 == "W" else (f2_id if o2 == "W" else None)

            details = row.get("DETAILS", "").strip()
            bonus = None
            if "Performance of the Night" in details:
                bonus = "Performance of the Night"
            elif "Fight of the Night" in details:
                bonus = "Fight of the Night"

            fight_data = {
                "event_id": eid,
                "fighter_a_id": f1_id,
                "fighter_b_id": f2_id,
                "winner_id": winner_id,
                "weight_class": row.get("WEIGHTCLASS", "").strip() or None,
                "result": outcome,
                "method": row.get("METHOD", "").strip() or None,
                "round": row.get("ROUND", "").strip() or None,
                "time": row.get("TIME", "").strip() or None,
                "referee": row.get("REFEREE", "").strip() or None,
                "bonus": bonus,
                "source": "UFCStats",
                "source_url": row.get("URL", "").strip() or None,
                "title_fight": "Title" in row.get("WEIGHTCLASS", ""),
            }

            await repo.upsert_fight(fight_data)
            f_success += 1
            if f_success % 500 == 0:
                await session.commit()

        await session.commit()

    log.info(f"✅ ETL Complete! Fights: {f_success} success, {f_skipped} skipped.")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Seed fighters, events, and fights from UFCStats GitHub CSVs"
    )
    parser.add_argument("--force", action="store_true", help="Re-seed all data")
    args = parser.parse_args()
    asyncio.run(run_etl(force=args.force))


if __name__ == "__main__":
    main()

"use client";

import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
  Legend
} from "recharts";

interface FighterData {
  name: string;
  str_acc: number | null;
  str_def: number | null;
  td_acc: number | null;
  td_def: number | null;
  slpm: number | null;
}

interface RadarProps {
  fighter1: FighterData;
  fighter2: FighterData;
}

export function ComparisonRadar({ fighter1, fighter2 }: RadarProps) {
  const normalizePercent = (val: number | null) => {
    if (!val) return 0;
    return val > 1 ? val : val * 100;
  };

  const normalizeSLpM = (val: number | null) => {
    if (!val) return 0;
    return Math.min(val * 10, 100);
  };

  const data = [
    {
      subject: "Striking Acc",
      A: normalizePercent(fighter1.str_acc),
      B: normalizePercent(fighter2.str_acc),
      fullMark: 100,
    },
    {
      subject: "Striking Def",
      A: normalizePercent(fighter1.str_def),
      B: normalizePercent(fighter2.str_def),
      fullMark: 100,
    },
    {
      subject: "Takedown Acc",
      A: normalizePercent(fighter1.td_acc),
      B: normalizePercent(fighter2.td_acc),
      fullMark: 100,
    },
    {
      subject: "Takedown Def",
      A: normalizePercent(fighter1.td_def),
      B: normalizePercent(fighter2.td_def),
      fullMark: 100,
    },
    {
      subject: "Striking Vol",
      A: normalizeSLpM(fighter1.slpm),
      B: normalizeSLpM(fighter2.slpm),
      fullMark: 100,
    }
  ];

  return (
    <div className="w-full h-[400px] bg-card border border-border/50 rounded-xl p-4 shadow-sm">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
          <PolarGrid stroke="hsl(var(--muted-foreground))" strokeOpacity={0.2} />
          <PolarAngleAxis
            dataKey="subject"
            tick={{ fill: "hsl(var(--foreground))", fontSize: 12, fontWeight: 600 }}
          />
          <PolarRadiusAxis
            angle={30}
            domain={[0, 100]}
            tick={false}
            axisLine={false}
          />
          <Radar
            name={fighter1.name}
            dataKey="A"
            stroke="hsl(var(--primary))"
            fill="hsl(var(--primary))"
            fillOpacity={0.4}
            strokeWidth={2}
          />
          <Radar
            name={fighter2.name}
            dataKey="B"
            stroke="hsl(var(--chart-2, 220 70% 50%))" // Blue-ish fallback for second fighter
            fill="hsl(var(--chart-2, 220 70% 50%))"
            fillOpacity={0.4}
            strokeWidth={2}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--card))",
              borderColor: "hsl(var(--border))",
              borderRadius: "8px",
              color: "hsl(var(--foreground))"
            }}
            itemStyle={{ fontWeight: 600 }}
          />
          <Legend
            wrapperStyle={{ paddingTop: "20px", fontWeight: 600 }}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

"use client";

interface FighterBasic {
  name: string;
  record: string | null;
  height_cm: number | null;
  reach_cm: number | null;
  stance: string | null;
  is_champion: boolean;
  current_ranking: number | null;
}

interface TaleOfTheTapeProps {
  fighter1: FighterBasic;
  fighter2: FighterBasic;
}

export function TaleOfTheTape({ fighter1, fighter2 }: TaleOfTheTapeProps) {
  
  const getRanking = (f: FighterBasic) => {
    if (f.is_champion) return "Champion";
    if (f.current_ranking) return `#${f.current_ranking}`;
    return "Unranked";
  };
  
  const getHighlightClass = (val1: number | null, val2: number | null, forFighter1: boolean) => {
    if (!val1 || !val2) return "";
    if (val1 > val2 && forFighter1) return "text-primary font-bold";
    if (val2 > val1 && !forFighter1) return "text-primary font-bold";
    return "";
  };

  return (
    <div className="w-full bg-card border border-border/50 rounded-xl overflow-hidden shadow-sm">
      <div className="bg-muted/50 p-4 text-center border-b border-border/50">
        <h3 className="font-extrabold text-xl tracking-tight uppercase">Tale of the Tape</h3>
      </div>
      
      <div className="divide-y divide-border/30">
        
        {/* Name Header */}
        <div className="grid grid-cols-3 text-center py-4 px-2 items-center bg-background/50">
          <div className="font-bold text-lg">{fighter1.name}</div>
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Fighter</div>
          <div className="font-bold text-lg">{fighter2.name}</div>
        </div>

        {/* Record */}
        <div className="grid grid-cols-3 text-center py-3 px-2 items-center">
          <div className="font-medium">{fighter1.record || "-"}</div>
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Record</div>
          <div className="font-medium">{fighter2.record || "-"}</div>
        </div>

        {/* Ranking */}
        <div className="grid grid-cols-3 text-center py-3 px-2 items-center">
          <div className="font-medium">{getRanking(fighter1)}</div>
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Ranking</div>
          <div className="font-medium">{getRanking(fighter2)}</div>
        </div>

        {/* Height */}
        <div className="grid grid-cols-3 text-center py-3 px-2 items-center">
          <div className={`font-medium ${getHighlightClass(fighter1.height_cm, fighter2.height_cm, true)}`}>
            {fighter1.height_cm ? `${fighter1.height_cm.toFixed(1)} cm` : "-"}
          </div>
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Height</div>
          <div className={`font-medium ${getHighlightClass(fighter1.height_cm, fighter2.height_cm, false)}`}>
            {fighter2.height_cm ? `${fighter2.height_cm.toFixed(1)} cm` : "-"}
          </div>
        </div>

        {/* Reach */}
        <div className="grid grid-cols-3 text-center py-3 px-2 items-center">
          <div className={`font-medium ${getHighlightClass(fighter1.reach_cm, fighter2.reach_cm, true)}`}>
            {fighter1.reach_cm ? `${fighter1.reach_cm.toFixed(1)} cm` : "-"}
          </div>
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Reach</div>
          <div className={`font-medium ${getHighlightClass(fighter1.reach_cm, fighter2.reach_cm, false)}`}>
            {fighter2.reach_cm ? `${fighter2.reach_cm.toFixed(1)} cm` : "-"}
          </div>
        </div>

        {/* Stance */}
        <div className="grid grid-cols-3 text-center py-3 px-2 items-center">
          <div className="font-medium">{fighter1.stance || "-"}</div>
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Stance</div>
          <div className="font-medium">{fighter2.stance || "-"}</div>
        </div>

      </div>
    </div>
  );
}

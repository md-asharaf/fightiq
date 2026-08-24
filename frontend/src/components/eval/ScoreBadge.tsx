import { Badge } from "@/components/ui/badge";

export function ScoreBadge({ score }: { score: number | null | undefined }) {
  if (score === null || score === undefined) {
    return <span className="text-muted-foreground">N/A</span>;
  }
  
  let color = "bg-red-500/20 text-red-500";
  if (score >= 0.8) color = "bg-green-500/20 text-green-500";
  else if (score >= 0.6) color = "bg-yellow-500/20 text-yellow-500";

  return (
    <Badge variant="outline" className={`${color} border-transparent font-bold`}>
      {score.toFixed(2)}
    </Badge>
  );
}

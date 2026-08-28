import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function MetricCard({ title, desc }: { title: string; desc: string }) {
  return (
    <Card className="bg-card border-2 border-border shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.05)] rounded-none">
      <CardHeader className="p-4 border-b-2 border-border bg-muted/50">
        <CardTitle className="text-xs font-black uppercase tracking-wider text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-4">
        <div className="text-3xl font-black text-foreground">--</div>
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mt-2">{desc}</p>
      </CardContent>
    </Card>
  );
}

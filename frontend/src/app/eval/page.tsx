"use client";

import { useState, useEffect } from "react";
import { ShieldCheck, PlayCircle, Loader2 } from "lucide-react";
import { fetchApi } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default function EvalDashboard() {
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [evaluating, setEvaluating] = useState(false);

  useEffect(() => {
    loadResults();
  }, []);

  const loadResults = async () => {
    setLoading(true);
    try {
      const data = await fetchApi("/eval/results");
      setResults(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleRunEval = async () => {
    setEvaluating(true);
    try {
      await fetchApi("/eval/run", { method: "POST" });
      await loadResults();
      alert("Evaluation completed successfully!");
    } catch (error: any) {
      alert("Failed to run evaluation: " + error.message);
    } finally {
      setEvaluating(false);
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-8 max-w-6xl space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">RAG Evaluation Dashboard</h1>
          <p className="text-muted-foreground">Monitor the quality of the AI responses using Ragas metrics.</p>
        </div>
        <Button onClick={handleRunEval} disabled={evaluating} className="bg-red-600 hover:bg-red-700 text-white">
          {evaluating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlayCircle className="mr-2 h-4 w-4" />}
          {evaluating ? "Evaluating..." : "Run Evaluation"}
        </Button>
      </div>

      <div className="grid md:grid-cols-4 gap-4">
        <MetricCard title="Faithfulness" desc="Factual consistency with context" />
        <MetricCard title="Answer Relevancy" desc="How relevant the answer is" />
        <MetricCard title="Context Precision" desc="Signal-to-noise ratio in retrieved context" />
        <MetricCard title="Context Recall" desc="Can it retrieve all necessary info?" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-red-500" /> Evaluation History</CardTitle>
          <CardDescription>Historical performance of the RAG system against the golden dataset.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Run ID</TableHead>
                  <TableHead>Faithfulness</TableHead>
                  <TableHead>Answer Relevancy</TableHead>
                  <TableHead>Context Precision</TableHead>
                  <TableHead>Context Recall</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-6"><Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></TableCell>
                  </TableRow>
                ) : results.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                      No evaluations run yet. Click "Run Evaluation" to test the RAG system.
                    </TableCell>
                  </TableRow>
                ) : (
                  results.map((res) => (
                    <TableRow key={res.id}>
                      <TableCell className="font-mono text-xs">{res.id.split("-")[0]}</TableCell>
                      <TableCell><ScoreBadge score={res.metrics.faithfulness} /></TableCell>
                      <TableCell><ScoreBadge score={res.metrics.answer_relevancy} /></TableCell>
                      <TableCell><ScoreBadge score={res.metrics.context_precision} /></TableCell>
                      <TableCell><ScoreBadge score={res.metrics.context_recall} /></TableCell>
                      <TableCell>{new Date(res.created_at).toLocaleString()}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function MetricCard({ title, desc }: { title: string, desc: string }) {
  return (
    <Card className="bg-card/50">
      <CardHeader className="p-4">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <div className="text-2xl font-bold">--</div>
        <p className="text-xs text-muted-foreground mt-1">{desc}</p>
      </CardContent>
    </Card>
  );
}

function ScoreBadge({ score }: { score: number | null }) {
  if (score === null || score === undefined) return <span className="text-muted-foreground">N/A</span>;
  
  let color = "bg-red-500/20 text-red-500";
  if (score >= 0.8) color = "bg-green-500/20 text-green-500";
  else if (score >= 0.6) color = "bg-yellow-500/20 text-yellow-500";

  return (
    <Badge variant="outline" className={`${color} border-transparent font-bold`}>
      {score.toFixed(2)}
    </Badge>
  );
}

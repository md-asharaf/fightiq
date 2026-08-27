"use client";


import { ShieldCheck, PlayCircle, Loader2 } from "lucide-react";
import { useEval } from "@/hooks/useEval";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MetricCard } from "@/components/eval/MetricCard";
import { ScoreBadge } from "@/components/eval/ScoreBadge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export function EvalDashboardView() {
  const { results, loading, evaluating, runEvaluation } = useEval();

  const handleRunEval = async () => {
    try {
      await runEvaluation();
    } catch (error: unknown) {
      if (error instanceof Error) alert("Failed to run evaluation: " + error.message);
      else alert("Failed to run evaluation: Unknown error");
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-8 max-w-6xl space-y-8">
      <div className="flex flex-col md:flex-row gap-4 md:justify-between md:items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">RAG Evaluation Dashboard</h1>
          <p className="text-muted-foreground">Monitor the quality of the AI responses using Ragas metrics.</p>
        </div>

        <AlertDialog>
          <AlertDialogTrigger
            render={<Button disabled={evaluating} className="bg-red-600 hover:bg-red-700 text-white" />}
          >
            {evaluating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlayCircle className="mr-2 h-4 w-4" />}
            {evaluating ? "Evaluating..." : "Run Evaluation"}
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Run RAG Evaluation?</AlertDialogTitle>
              <AlertDialogDescription>
                This will trigger the generation and evaluation of answers against the golden dataset using the LLM. It may take several minutes to complete and consumes LLM tokens.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleRunEval} className="bg-red-600 text-white hover:bg-red-700">Run Evaluation</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
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
          <div className="rounded-none border border-border overflow-x-auto">
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
                      No evaluations run yet. Click &quot;Run Evaluation&quot; to test the RAG system.
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

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
      <div className="flex flex-col md:flex-row gap-4 md:justify-between md:items-center border-b-4 border-foreground pb-6">
        <div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tighter uppercase text-foreground">Evaluation Dashboard</h1>
          <p className="text-muted-foreground font-bold text-sm md:text-base mt-3 uppercase tracking-wider">Monitor Ragas metrics against the Golden Dataset.</p>
        </div>

        <AlertDialog>
          <AlertDialogTrigger
            render={<Button disabled={evaluating} className="bg-red-600 hover:bg-red-700 text-white font-black uppercase tracking-widest rounded-none h-12 md:h-14 px-6 md:px-8 border-2 border-red-600 transition-colors" />}
          >
            {evaluating ? <Loader2 className="mr-2 h-4 w-4 md:h-5 md:w-5 animate-spin" /> : <PlayCircle className="mr-2 h-4 w-4 md:h-5 md:w-5" />}
            {evaluating ? "Evaluating..." : "Run Evaluation"}
          </AlertDialogTrigger>
          <AlertDialogContent className="rounded-none border-2 border-border">
            <AlertDialogHeader>
              <AlertDialogTitle className="font-black uppercase tracking-wider text-xl">Run RAG Evaluation?</AlertDialogTitle>
              <AlertDialogDescription className="font-bold text-muted-foreground">
                This will trigger the generation and evaluation of answers against the golden dataset using the LLM. It may take several minutes to complete and consumes LLM tokens.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="rounded-none font-bold uppercase tracking-wider">Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleRunEval} className="bg-red-600 text-white hover:bg-red-700 rounded-none font-black uppercase tracking-widest">Run Evaluation</AlertDialogAction>
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

      <Card className="bg-card border-2 border-border shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.05)] rounded-none">
        <CardHeader className="border-b-2 border-border bg-muted/50 p-4 md:p-6">
          <CardTitle className="flex items-center gap-2 text-xl md:text-2xl font-black tracking-tighter uppercase"><ShieldCheck className="h-5 w-5 md:h-6 md:w-6 text-red-600" /> Evaluation History</CardTitle>
          <CardDescription className="font-bold uppercase tracking-wider text-[10px] md:text-xs mt-2 text-muted-foreground">Historical performance of the RAG system against the golden dataset.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="border-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-b-2 border-border">
                  <TableHead className="font-bold uppercase tracking-wider text-xs h-12">Run ID</TableHead>
                  <TableHead className="font-bold uppercase tracking-wider text-xs h-12">Faithfulness</TableHead>
                  <TableHead className="font-bold uppercase tracking-wider text-xs h-12">Answer Relevancy</TableHead>
                  <TableHead className="font-bold uppercase tracking-wider text-xs h-12">Context Precision</TableHead>
                  <TableHead className="font-bold uppercase tracking-wider text-xs h-12">Context Recall</TableHead>
                  <TableHead className="font-bold uppercase tracking-wider text-xs h-12 text-right pr-6">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12">
                      <div className="flex flex-col items-center gap-4 text-muted-foreground">
                        <Loader2 className="h-6 w-6 md:h-8 md:w-8 animate-spin mx-auto text-red-600" />
                        <span className="font-bold uppercase tracking-wider text-xs md:text-sm">Loading Evaluations...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : results.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-muted-foreground font-bold uppercase tracking-wider text-sm">
                      No evaluations run yet. Click &quot;Run Evaluation&quot; to test the RAG system.
                    </TableCell>
                  </TableRow>
                ) : (
                  results.map((res) => (
                    <TableRow key={res.id} className="border-border hover:bg-muted/50 transition-colors">
                      <TableCell className="font-mono text-xs font-bold">{res.id.split("-")[0]}</TableCell>
                      <TableCell><ScoreBadge score={res.metrics.faithfulness} /></TableCell>
                      <TableCell><ScoreBadge score={res.metrics.answer_relevancy} /></TableCell>
                      <TableCell><ScoreBadge score={res.metrics.context_precision} /></TableCell>
                      <TableCell><ScoreBadge score={res.metrics.context_recall} /></TableCell>
                      <TableCell className="text-right pr-6 font-bold text-sm text-muted-foreground">{new Date(res.created_at).toLocaleString()}</TableCell>
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

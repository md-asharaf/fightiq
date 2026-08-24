import { useState, useCallback } from "react";
import { fetchApi } from "@/lib/api";
import { EvalRun } from "@/types";

export function useEval() {
  const [results, setResults] = useState<EvalRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [evaluating, setEvaluating] = useState(false);

  const loadResults = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchApi("/eval/results");
      setResults(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  const runEvaluation = async (): Promise<void> => {
    setEvaluating(true);
    try {
      await fetchApi("/eval/run", { method: "POST" });
      await loadResults();
    } finally {
      setEvaluating(false);
    }
  };

  return { results, loading, evaluating, loadResults, runEvaluation };
}

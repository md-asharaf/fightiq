import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchApi } from "@/lib/api";
import { useCallback } from "react";
import { EvalRun } from "@/types";

export function useEval() {
  const queryClient = useQueryClient();

  const { data: results = [], isLoading: loading } = useQuery<EvalRun[]>({
    queryKey: ["eval-results"],
    queryFn: () => fetchApi("/eval/results"),
  });

  const { mutateAsync: runEvaluation, isPending: evaluating } = useMutation({
    mutationFn: () => fetchApi("/eval/run", { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["eval-results"] });
    },
  });

  return {
    results,
    loading,
    evaluating,
    loadResults: useCallback(() => queryClient.invalidateQueries({ queryKey: ["eval-results"] }), [queryClient]),
    runEvaluation
  };
}

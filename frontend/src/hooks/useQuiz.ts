import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchApi } from "@/lib/api";
import { QuizSession, QuizResult } from "@/types";
import { useCallback } from "react";
import { useSession } from "@/lib/auth-client";

export function useQuizList() {
  const queryClient = useQueryClient();
  const { data: session, isPending: sessionLoading } = useSession();

  const { data: sessions = [], isLoading } = useQuery<QuizSession[]>({
    queryKey: ["quiz-sessions"],
    queryFn: () => fetchApi("/quiz/sessions"),
    enabled: !!session && !sessionLoading,
  });

  const { mutateAsync: generateMutateAsync } = useMutation({
    mutationFn: async ({ topic, difficulty }: { topic: string; difficulty: string }) => {
      const response = await fetchApi("/quiz/generate", {
        method: "POST",
        body: JSON.stringify({ topic, difficulty, num_questions: 5 }),
      });
      return response.id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quiz-sessions"] });
    },
  });

  return {
    sessions,
    loadingSessions: isLoading,
    generateQuiz: useCallback((topic: string, difficulty: string) => generateMutateAsync({ topic, difficulty }), [generateMutateAsync]),
  };
}

export function useQuizSession(sessionId: string) {
  const queryClient = useQueryClient();
  const { data: session, isLoading: quizSessionLoading, refetch: refetchSession } = useQuery<QuizSession>({
    queryKey: ["quiz-session", sessionId],
    queryFn: () => fetchApi(`/quiz/sessions/${sessionId}`),
    enabled: !!sessionId,
  });

  const { data: result, isLoading: resultLoading } = useQuery<QuizResult>({
    queryKey: ["quiz-result", sessionId],
    queryFn: () => fetchApi(`/quiz/results/${sessionId}`),
    enabled: !!session && session.status === "completed",
  });

  const { mutateAsync: submitQuizMutateAsync } = useMutation({
    mutationFn: async (answers: Record<string, string>) => {
      if (!session) throw new Error("No session");
      return fetchApi(`/quiz/submit`, {
        method: "POST",
        body: JSON.stringify({ session_id: session.id, answers }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quiz-session", sessionId] });
      queryClient.invalidateQueries({ queryKey: ["quiz-result", sessionId] });
    },
  });

  return {
    session,
    result,
    loading: quizSessionLoading || (session?.status === "completed" && resultLoading),
    loadQuiz: refetchSession,
    submitQuiz: submitQuizMutateAsync,
  };
}

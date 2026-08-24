import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchApi } from "@/lib/api";
import { QuizSession, QuizResult } from "@/types";

export function useQuizList() {
  const queryClient = useQueryClient();

  const { data: sessions = [] } = useQuery<QuizSession[]>({
    queryKey: ["quiz-sessions"],
    queryFn: () => fetchApi("/quiz/sessions"),
  });

  const generateMutation = useMutation({
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
    loadSessions: () => queryClient.invalidateQueries({ queryKey: ["quiz-sessions"] }),
    generateQuiz: (topic: string, difficulty: string) => generateMutation.mutateAsync({ topic, difficulty }),
  };
}

export function useQuizSession(sessionId: string) {
  const queryClient = useQueryClient();

  const { data: session, isLoading: sessionLoading, refetch: refetchSession } = useQuery<QuizSession>({
    queryKey: ["quiz-session", sessionId],
    queryFn: () => fetchApi(`/quiz/sessions/${sessionId}`),
    enabled: !!sessionId,
  });

  const { data: result, isLoading: resultLoading } = useQuery<QuizResult>({
    queryKey: ["quiz-result", sessionId],
    queryFn: () => fetchApi(`/quiz/results/${sessionId}`),
    enabled: !!session && session.status === "completed",
  });

  const submitMutation = useMutation({
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
    loading: sessionLoading || (session?.status === "completed" && resultLoading),
    loadQuiz: refetchSession,
    submitQuiz: submitMutation.mutateAsync,
  };
}

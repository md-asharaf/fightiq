import { useState, useCallback } from "react";
import { fetchApi } from "@/lib/api";
import { QuizSession, QuizResult } from "@/types";

export function useQuizList() {
  const [sessions, setSessions] = useState<QuizSession[]>([]);

  const loadSessions = useCallback(async () => {
    try {
      const data = await fetchApi("/quiz/sessions");
      setSessions(data);
    } catch (error) {
      console.error(error);
    }
  }, []);

  const generateQuiz = async (topic: string, difficulty: string): Promise<string> => {
    const response = await fetchApi("/quiz/generate", {
      method: "POST",
      body: JSON.stringify({ topic, difficulty, num_questions: 5 }),
    });
    return response.id;
  };

  return { sessions, loadSessions, generateQuiz };
}

export function useQuizSession(sessionId: string) {
  const [session, setSession] = useState<QuizSession | null>(null);
  const [result, setResult] = useState<QuizResult | null>(null);
  const [loading, setLoading] = useState(true);

  const loadQuiz = useCallback(async () => {
    if (!sessionId) return;
    setLoading(true);
    try {
      const data = await fetchApi(`/quiz/sessions/${sessionId}`);
      setSession(data);
      if (data.status === "completed") {
        const resData = await fetchApi(`/quiz/evaluate/${sessionId}`, { 
          method: "POST", 
          body: JSON.stringify({ answers: {} }) 
        });
        setResult(resData);
      }
    } catch (error) {
      console.error(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  const submitQuiz = async (answers: Record<string, string>) => {
    if (!session) return;
    const resData = await fetchApi(`/quiz/evaluate/${session.id}`, {
      method: "POST",
      body: JSON.stringify({ answers }),
    });
    setResult(resData);
    setSession({ ...session, status: "completed" });
  };

  return { session, result, loading, loadQuiz, submitQuiz };
}

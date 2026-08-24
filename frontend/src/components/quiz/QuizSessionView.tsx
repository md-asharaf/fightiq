"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useQuizSession } from "@/hooks/useQuiz";
import { Loader2 } from "lucide-react";
import { QuizTakingView } from "@/components/quiz/QuizTakingView";
import { QuizResultView } from "@/components/quiz/QuizResultView";

export function QuizSessionView() {
  const params = useParams();
  const sessionId = params.sessionId as string;
  const { session, result, loading, loadQuiz, submitQuiz } = useQuizSession(sessionId);
  const [evaluating, setEvaluating] = useState(false);

  useEffect(() => {
    loadQuiz();
  }, [loadQuiz]);

  const handleSubmit = async (answers: Record<string, string>) => {
    setEvaluating(true);
    try {
      await submitQuiz(answers);
    } catch (error: unknown) {
      if (error instanceof Error) alert("Failed to evaluate quiz: " + error.message);
      else alert("Failed to evaluate quiz: Unknown error");
    } finally {
      setEvaluating(false);
    }
  };

  if (loading) {
    return <div className="flex h-[50vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-red-500" /></div>;
  }

  if (!session) {
    return <div className="container mx-auto p-8">Quiz not found.</div>;
  }

  if (session.status === "completed" && result) {
    return <QuizResultView session={session} result={result} />;
  }

  return (
    <QuizTakingView 
      session={session} 
      onSubmit={handleSubmit} 
      evaluating={evaluating} 
    />
  );
}

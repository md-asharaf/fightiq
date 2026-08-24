"use client";

import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import ReactMarkdown from "react-markdown";
import { QuizSession, QuizResult } from "@/types";

export function QuizResultView({ session, result }: { session: QuizSession; result: QuizResult }) {
  const router = useRouter();
  const percentage = Math.round((result.total_score / result.max_score) * 100);

  return (
    <div className="container mx-auto p-4 md:p-8 max-w-4xl space-y-8">
      <Card className="border-red-900/30 text-center py-8">
        <CardHeader>
          <CardTitle className="text-4xl text-gradient">Quiz Results</CardTitle>
          <CardDescription className="text-xl mt-2">Topic: {session.topic}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-6xl font-black">{percentage}%</div>
          <p className="text-muted-foreground">You scored {result.total_score} out of {result.max_score}.</p>
          <Progress value={percentage} className="w-1/2 mx-auto h-3" />
        </CardContent>
        <CardFooter className="justify-center pt-6">
          <Button onClick={() => router.push("/quiz")}>Back to Quizzes</Button>
        </CardFooter>
      </Card>

      <div className="space-y-6">
        <h3 className="text-2xl font-bold">Detailed Review</h3>
        {result.evaluations.map((ev, idx) => {
          const q = session.questions.find((q) => q.id === ev.question_id);
          const isCorrect = ev.score > 0;
          return (
            <Card key={idx} className={isCorrect ? "border-green-500/30" : "border-red-500/30"}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg">Q: {q?.question_text}</CardTitle>
                  {isCorrect ? <CheckCircle className="text-green-500 h-6 w-6 flex-shrink-0" /> : <XCircle className="text-red-500 h-6 w-6 flex-shrink-0" />}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="p-3 bg-muted/50 rounded-md">
                    <span className="font-semibold text-muted-foreground block mb-1">Your Answer:</span>
                    {ev.user_answer || "Skipped"}
                  </div>
                  <div className="p-3 bg-muted/50 rounded-md">
                    <span className="font-semibold text-muted-foreground block mb-1">Correct Answer:</span>
                    {ev.correct_answer}
                  </div>
                </div>
                <div className="mt-4 p-4 bg-background border border-border/50 rounded-md">
                  <span className="font-semibold block mb-2">AI Explanation:</span>
                  <div className="prose prose-sm dark:prose-invert">
                    <ReactMarkdown>{ev.explanation}</ReactMarkdown>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

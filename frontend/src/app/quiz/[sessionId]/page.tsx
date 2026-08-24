"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { fetchApi } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import ReactMarkdown from "react-markdown";

export default function QuizTakingPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;

  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [evaluating, setEvaluating] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    if (sessionId) {
      loadQuiz();
    }
  }, [sessionId]);

  const loadQuiz = async () => {
    try {
      const data = await fetchApi(`/quiz/sessions/${sessionId}`);
      setSession(data);
      if (data.status === "completed") {
        const resData = await fetchApi(`/quiz/evaluate/${sessionId}`, { method: "POST", body: JSON.stringify({ answers: {} }) });
        setResult(resData);
      }
    } catch (error) {
      console.error(error);
      alert("Failed to load quiz.");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAnswer = (questionId: string, choice: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: choice }));
  };

  const handleSubmit = async () => {
    if (Object.keys(answers).length < session.questions.length) {
      if (!confirm("You have unanswered questions. Submit anyway?")) return;
    }

    setEvaluating(true);
    try {
      const resData = await fetchApi(`/quiz/evaluate/${sessionId}`, {
        method: "POST",
        body: JSON.stringify({ answers }),
      });
      setResult(resData);
      setSession((prev: any) => ({ ...prev, status: "completed" }));
    } catch (error: any) {
      alert("Failed to evaluate quiz: " + error.message);
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

  // RESULT VIEW
  if (session.status === "completed" && result) {
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
          {result.evaluations.map((ev: any, idx: number) => {
            const q = session.questions.find((q: any) => q.id === ev.question_id);
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

  // QUIZ TAKING VIEW
  return (
    <div className="container mx-auto p-4 md:p-8 max-w-3xl space-y-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Taking Quiz</h1>
          <p className="text-muted-foreground capitalize">Topic: {session.topic} • {session.difficulty}</p>
        </div>
        <div className="text-sm font-medium bg-muted px-4 py-2 rounded-full">
          {Object.keys(answers).length} / {session.questions.length} Answered
        </div>
      </div>

      <div className="space-y-8">
        {session.questions.map((q: any, idx: number) => (
          <Card key={q.id}>
            <CardHeader>
              <CardTitle className="text-xl"><span className="text-red-500 mr-2">{idx + 1}.</span> {q.question_text}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {q.choices.map((choice: string, cIdx: number) => (
                  <div 
                    key={cIdx}
                    onClick={() => handleSelectAnswer(q.id, choice)}
                    className={`p-4 border rounded-lg cursor-pointer transition-all ${
                      answers[q.id] === choice 
                        ? "border-red-500 bg-red-500/10" 
                        : "border-border/50 hover:bg-muted/50 hover:border-border"
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${answers[q.id] === choice ? "border-red-500" : "border-muted-foreground"}`}>
                        {answers[q.id] === choice && <div className="w-2.5 h-2.5 bg-red-500 rounded-full" />}
                      </div>
                      <Label className="cursor-pointer flex-1 text-base leading-snug">{choice}</Label>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="pt-8 pb-16 flex justify-end">
        <Button size="lg" onClick={handleSubmit} disabled={evaluating} className="bg-red-600 hover:bg-red-700 text-white w-full md:w-auto px-12">
          {evaluating ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Evaluating...</> : "Submit Quiz"}
        </Button>
      </div>
    </div>
  );
}

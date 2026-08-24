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
  const percentage = Math.round(result.score_percentage * 100);

  return (
    <div className="flex-1 bg-zinc-950 text-white min-h-screen">
      <div className="container mx-auto p-4 md:p-8 max-w-4xl space-y-12 pb-32 pt-12">
        <Card className="bg-black border-red-600/30 text-center py-12 rounded-xl shadow-2xl relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-red-900/10 to-transparent pointer-events-none" />
          <CardHeader className="relative z-10">
            <CardTitle className="text-4xl md:text-5xl font-black uppercase tracking-tighter text-white">Fight IQ Score</CardTitle>
            <CardDescription className="text-lg mt-2 font-bold uppercase tracking-widest text-zinc-400">Topic: {session.topic}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 relative z-10">
            <div className={`text-7xl md:text-8xl font-black ${percentage >= 70 ? 'text-green-500' : 'text-red-600'}`}>
              {percentage}%
            </div>
            <p className="text-zinc-400 font-medium text-lg">You scored {result.score} out of {result.total_questions}.</p>
            <Progress value={percentage} className="w-1/2 mx-auto h-2 bg-zinc-900 [&>div]:bg-red-600" />
          </CardContent>
          <CardFooter className="justify-center pt-8 relative z-10">
            <Button onClick={() => router.push("/quiz")} className="bg-white text-black hover:bg-zinc-200 font-bold uppercase tracking-wider rounded-none px-12 h-14">
              Back to Quizzes
            </Button>
          </CardFooter>
        </Card>

        <div className="space-y-8">
          <h3 className="text-3xl font-black uppercase tracking-tighter border-b border-white/10 pb-4">Detailed Review</h3>
          {result.results.map((ev, idx) => {
            const q = session.questions.find((q) => q.id === ev.question_id);
            const isCorrect = ev.is_correct;
            const userOptionText = q?.options.find(o => o.id === ev.selected_option_id)?.text || "Skipped";
            const correctOptionText = q?.options.find(o => o.id === ev.correct_option_id)?.text || "Unknown";

            return (
              <Card key={idx} className={`bg-black rounded-xl overflow-hidden shadow-xl border ${isCorrect ? "border-green-500/20" : "border-red-600/20"}`}>
                <CardHeader className={`py-6 border-b ${isCorrect ? 'bg-green-950/20 border-green-500/10' : 'bg-red-950/10 border-red-600/10'}`}>
                  <div className="flex items-start justify-between gap-4">
                    <CardTitle className="text-xl leading-relaxed font-medium">
                      <span className="font-black text-zinc-500 mr-2">Q{idx + 1}.</span> {q?.text}
                    </CardTitle>
                    {isCorrect ? <CheckCircle className="text-green-500 h-8 w-8 flex-shrink-0" /> : <XCircle className="text-red-600 h-8 w-8 flex-shrink-0" />}
                  </div>
                </CardHeader>
                <CardContent className="space-y-6 p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-base">
                    <div className={`p-4 rounded-lg border ${isCorrect ? 'bg-green-950/20 border-green-500/20' : 'bg-red-950/20 border-red-600/20'}`}>
                      <span className="font-bold uppercase tracking-widest text-xs text-zinc-500 block mb-2">Your Answer</span>
                      <div className="font-medium text-white">{userOptionText}</div>
                    </div>
                    <div className="p-4 rounded-lg bg-zinc-900/50 border border-white/5">
                      <span className="font-bold uppercase tracking-widest text-xs text-zinc-500 block mb-2">Correct Answer</span>
                      <div className="font-medium text-white">{correctOptionText}</div>
                    </div>
                  </div>
                  <div className="mt-6 p-6 bg-zinc-900 rounded-lg border border-white/5">
                    <span className="font-black uppercase tracking-widest text-xs text-red-500 block mb-4">AI Explanation</span>
                    <div className="prose prose-sm dark:prose-invert max-w-none prose-p:leading-relaxed prose-p:text-zinc-300">
                      <ReactMarkdown>{ev.explanation}</ReactMarkdown>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { QuizSession } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface QuizTakingViewProps {
  session: QuizSession;
  onSubmit: (answers: Record<string, string>) => Promise<void>;
  evaluating: boolean;
}

export function QuizTakingView({ session, onSubmit, evaluating }: QuizTakingViewProps) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleSelectAnswer = (questionId: string, choice: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: choice }));
  };

  const handleAttemptSubmit = () => {
    if (Object.keys(answers).length < session.questions.length) {
      setDialogOpen(true);
    } else {
      onSubmit(answers);
    }
  };

  const confirmSubmit = () => {
    setDialogOpen(false);
    onSubmit(answers);
  };

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
        {session.questions.map((q, idx) => (
          <Card key={q.id}>
            <CardHeader>
              <CardTitle className="text-xl">
                <span className="text-red-500 mr-2">{idx + 1}.</span> {q.question_text}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {q.choices.map((choice, cIdx) => (
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
        <Button size="lg" onClick={handleAttemptSubmit} disabled={evaluating} className="bg-red-600 hover:bg-red-700 text-white w-full md:w-auto px-12">
          {evaluating ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Evaluating...</> : "Submit Quiz"}
        </Button>
      </div>

      <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Incomplete Quiz</AlertDialogTitle>
            <AlertDialogDescription>
              You have {session.questions.length - Object.keys(answers).length} unanswered questions. Unanswered questions will be marked incorrect. Are you sure you want to submit?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmSubmit} className="bg-red-600 text-white hover:bg-red-700">Submit Anyway</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

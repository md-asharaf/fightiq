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

import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

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
    <div className="flex-1 bg-background text-foreground min-h-screen">
      <div className="container mx-auto p-4 md:p-8 max-w-3xl space-y-8 pb-32 pt-12">
        <div className="flex justify-between items-center mb-10 border-b border-border pb-6">
          <div>
            <h1 className="text-4xl font-black tracking-tighter uppercase text-foreground">Quiz Engine</h1>
            <p className="text-muted-foreground font-bold uppercase tracking-wider text-sm mt-2">{session.topic} • {session.difficulty}</p>
          </div>
          <div className="text-sm font-bold uppercase tracking-wider bg-card border border-border px-4 py-2 rounded-md text-primary">
            {Object.keys(answers).length} / {session.questions.length} Answered
          </div>
        </div>

        <div className="space-y-10">
          {session.questions.map((q, idx) => (
            <Card key={q.id} className="bg-card border-border rounded-xl overflow-hidden shadow-2xl">
              <CardHeader className="bg-muted/50 border-b border-border py-6">
                <CardTitle className="text-xl text-foreground font-medium leading-relaxed">
                  <span className="text-primary font-black mr-3">{idx + 1}.</span> {q.text}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <RadioGroup 
                  value={answers[q.id] || ""} 
                  onValueChange={(val) => handleSelectAnswer(q.id, val)}
                  className="space-y-4"
                >
                  {q.options.map((opt, cIdx) => (
                    <div
                      key={cIdx}
                      className={`flex items-center space-x-3 p-4 border rounded-lg cursor-pointer transition-all ${
                        answers[q.id] === opt.id
                          ? "border-primary bg-primary/10"
                          : "border-border hover:bg-muted hover:border-muted-foreground/50"
                      }`}
                      onClick={() => handleSelectAnswer(q.id, opt.id)}
                    >
                      <RadioGroupItem value={opt.id} id={`${q.id}-${opt.id}`} className="border-primary text-primary data-[state=checked]:border-primary" />
                      <Label htmlFor={`${q.id}-${opt.id}`} className="cursor-pointer flex-1 text-base leading-snug text-foreground font-medium">
                        {opt.text}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="pt-12 flex justify-end">
          <Button 
            size="lg" 
            onClick={handleAttemptSubmit} 
            disabled={evaluating} 
            className="bg-primary hover:bg-primary/90 text-primary-foreground w-full md:w-auto px-16 h-14 text-lg font-bold uppercase tracking-wider rounded-none"
          >
            {evaluating ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Evaluating...</> : "Submit Quiz"}
          </Button>
        </div>

        <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <AlertDialogContent className="bg-background border border-border text-foreground rounded-none">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-2xl font-black uppercase text-primary">Incomplete Quiz</AlertDialogTitle>
              <AlertDialogDescription className="text-muted-foreground font-medium text-base">
                You have {session.questions.length - Object.keys(answers).length} unanswered questions. Unanswered questions will be marked incorrect. Are you sure you want to submit?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="mt-6">
              <AlertDialogCancel className="bg-card border-border text-foreground hover:bg-muted rounded-none uppercase font-bold tracking-wider">Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmSubmit} className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-none uppercase font-bold tracking-wider">Submit Anyway</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

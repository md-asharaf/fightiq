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
    <div className="flex-1 bg-zinc-950 text-white min-h-screen">
      <div className="container mx-auto p-4 md:p-8 max-w-3xl space-y-8 pb-32 pt-12">
        <div className="flex justify-between items-center mb-10 border-b border-white/10 pb-6">
          <div>
            <h1 className="text-4xl font-black tracking-tighter uppercase text-white">Quiz Engine</h1>
            <p className="text-zinc-400 font-bold uppercase tracking-wider text-sm mt-2">{session.topic} • {session.difficulty}</p>
          </div>
          <div className="text-sm font-bold uppercase tracking-wider bg-zinc-900 border border-white/10 px-4 py-2 rounded-md text-red-500">
            {Object.keys(answers).length} / {session.questions.length} Answered
          </div>
        </div>

        <div className="space-y-10">
          {session.questions.map((q, idx) => (
            <Card key={q.id} className="bg-black border-white/10 rounded-xl overflow-hidden shadow-2xl">
              <CardHeader className="bg-zinc-900/50 border-b border-white/5 py-6">
                <CardTitle className="text-xl text-white font-medium leading-relaxed">
                  <span className="text-red-600 font-black mr-3">{idx + 1}.</span> {q.text}
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
                          ? "border-red-600 bg-red-600/10"
                          : "border-white/10 hover:bg-zinc-900 hover:border-zinc-700"
                      }`}
                      onClick={() => handleSelectAnswer(q.id, opt.id)}
                    >
                      <RadioGroupItem value={opt.id} id={`${q.id}-${opt.id}`} className="border-zinc-600 text-red-600 data-[state=checked]:border-red-600" />
                      <Label htmlFor={`${q.id}-${opt.id}`} className="cursor-pointer flex-1 text-base leading-snug text-zinc-300 font-medium">
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
            className="bg-red-600 hover:bg-red-700 text-white w-full md:w-auto px-16 h-14 text-lg font-bold uppercase tracking-wider rounded-none"
          >
            {evaluating ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Evaluating...</> : "Submit Quiz"}
          </Button>
        </div>

        <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <AlertDialogContent className="bg-zinc-950 border border-white/10 text-white rounded-none">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-2xl font-black uppercase text-red-600">Incomplete Quiz</AlertDialogTitle>
              <AlertDialogDescription className="text-zinc-400 font-medium text-base">
                You have {session.questions.length - Object.keys(answers).length} unanswered questions. Unanswered questions will be marked incorrect. Are you sure you want to submit?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="mt-6">
              <AlertDialogCancel className="bg-zinc-900 border-white/10 text-white hover:bg-zinc-800 rounded-none uppercase font-bold tracking-wider">Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmSubmit} className="bg-red-600 text-white hover:bg-red-700 rounded-none uppercase font-bold tracking-wider">Submit Anyway</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

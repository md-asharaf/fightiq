"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BrainCircuit, Loader2 } from "lucide-react";
import { useSession } from "@/lib/auth-client";
import { useQuizList } from "@/hooks/useQuiz";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { QuizSession } from "@/types";
import { Skull, Shield, Target, GraduationCap } from "lucide-react";

const difficultyMeta = {
  beginner: {
    color: "border-green-500 text-green-500",
    icon: <GraduationCap className="h-5 w-5 md:h-6 md:w-6" />,
    desc: "Direct and factual questions. Options are easy to distinguish. Perfect for casual fans."
  },
  intermediate: {
    color: "border-blue-500 text-blue-500",
    icon: <Shield className="h-5 w-5 md:h-6 md:w-6" />,
    desc: "Analytical and situational questions. Requires good understanding of the sport."
  },
  expert: {
    color: "border-orange-500 text-orange-500",
    icon: <Target className="h-5 w-5 md:h-6 md:w-6" />,
    desc: "Highly specific trivia and technical stats. Watch out for tricky 'trap' options!"
  },
  hardcore: {
    color: "border-red-600 text-red-600 bg-red-950/20",
    icon: <Skull className="h-5 w-5 md:h-6 md:w-6" />,
    desc: "Punishingly difficult. Obscure history and deep analytics. Wrong answers look totally correct."
  }
};

export function QuizSetupView() {
  const router = useRouter();
  const { data: session } = useSession();
  const { sessions, loadingSessions, generateQuiz } = useQuizList();
  const [loading, setLoading] = useState(false);
  const [selectedDifficulty, setSelectedDifficulty] = useState("intermediate");

  const handleGenerate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const topic = formData.get("topic") as string;
    const difficulty = formData.get("difficulty") as string;
    if (!topic.trim()) return;

    setLoading(true);
    try {
      const sessionId = await generateQuiz(topic, difficulty);
      router.push(`/quiz/${sessionId}`);
    } catch (error: unknown) {
      if (error instanceof Error) toast.error("Failed to generate quiz: " + error.message);
      else toast.error("Failed to generate quiz: Unknown error");
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 bg-background text-foreground min-h-full">
      <div className="container mx-auto p-4 md:p-8 max-w-5xl space-y-12 pt-12 pb-32">
        <div className="border-b-4 border-foreground pb-6">
          <h1 className="text-5xl md:text-6xl font-black tracking-tighter uppercase text-foreground">Quiz Engine</h1>
          <p className="text-muted-foreground font-bold text-sm md:text-base mt-3 uppercase tracking-wider">Test your MMA knowledge against the AI.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <Card className="bg-card border-2 border-border shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.05)] rounded-none">
            <CardHeader className="border-b-2 border-border bg-muted/50 p-6">
              <CardTitle className="flex items-center gap-3 text-2xl md:text-3xl font-black tracking-tighter uppercase text-foreground">
                <BrainCircuit className="h-6 w-6 md:h-8 md:w-8 text-red-600" />
                Generate New Quiz
              </CardTitle>
              <CardDescription className="text-muted-foreground font-bold uppercase text-xs tracking-wider mt-2">
                The AI will read the knowledge base and dynamically create a 5-question quiz.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-8">
              <form id="quiz-form" onSubmit={handleGenerate} className="space-y-8">
                <div className="space-y-3">
                  <Label htmlFor="topic" className="text-xs font-bold text-muted-foreground">Topic (e.g. Khabib, UFC 300, Rules)</Label>
                  <Input
                    id="topic"
                    name="topic"
                    defaultValue=""
                    placeholder="Enter any UFC topic..."
                    required
                    className="bg-background border-border text-foreground h-12 focus-visible:ring-primary rounded-none placeholder:text-muted-foreground"
                  />
                </div>
                <div className="space-y-3">
                  <Label htmlFor="difficulty" className="text-xs font-black uppercase tracking-widest text-muted-foreground">Difficulty</Label>
                  <Select name="difficulty" value={selectedDifficulty} onValueChange={(val) => val && setSelectedDifficulty(val)}>
                    <SelectTrigger id="difficulty" className="bg-background border-2 border-border text-foreground h-14 text-base font-bold rounded-none focus:ring-0 focus:border-red-600 transition-colors">
                      <SelectValue placeholder="Select difficulty" />
                    </SelectTrigger>
                    <SelectContent className="bg-background border-2 border-border text-foreground rounded-none shadow-none">
                      <SelectItem value="beginner" className="focus:bg-red-600 focus:text-white rounded-none cursor-pointer font-bold uppercase tracking-wider">Beginner</SelectItem>
                      <SelectItem value="intermediate" className="focus:bg-red-600 focus:text-white rounded-none cursor-pointer font-bold uppercase tracking-wider">Intermediate</SelectItem>
                      <SelectItem value="expert" className="focus:bg-red-600 focus:text-white rounded-none cursor-pointer font-bold uppercase tracking-wider">Expert</SelectItem>
                      <SelectItem value="hardcore" className="focus:bg-red-600 focus:text-white rounded-none cursor-pointer text-destructive font-black uppercase tracking-wider">Hardcore</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <div className={`mt-4 p-4 text-sm border-l-4 rounded-none bg-muted/20 ${difficultyMeta[selectedDifficulty as keyof typeof difficultyMeta].color}`}>
                    <h4 className="font-bold mb-1 flex items-center gap-2">
                      {difficultyMeta[selectedDifficulty as keyof typeof difficultyMeta].icon}
                      {selectedDifficulty.charAt(0).toUpperCase() + selectedDifficulty.slice(1)} Mode
                    </h4>
                    <p className="text-muted-foreground">
                      {difficultyMeta[selectedDifficulty as keyof typeof difficultyMeta].desc}
                    </p>
                  </div>
                </div>
              </form>
            </CardContent>
            <CardFooter className="bg-muted/50 p-6 border-t-2 border-border">
              <Button type="submit" form="quiz-form" disabled={loading || !session} className="w-full bg-red-600 hover:bg-red-700 text-white h-16 font-black uppercase tracking-widest rounded-none text-lg transition-colors">
                {!session ? (
                  "Login to Generate Quiz"
                ) : loading ? (
                  <>
                    <Loader2 className="mr-2 md:mr-3 h-5 w-5 md:h-6 md:w-6 animate-spin" /> Preparing Octagon...
                  </>
                ) : (
                  "Generate Quiz"
                )}
              </Button>
            </CardFooter>
          </Card>

          <Card className="bg-card border-2 border-border shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.05)] rounded-none flex flex-col">
            <CardHeader className="border-b-2 border-border bg-muted/50 p-6">
              <CardTitle className="text-2xl md:text-3xl font-black tracking-tighter uppercase text-foreground">Recent Quizzes</CardTitle>
              <CardDescription className="text-muted-foreground font-bold uppercase text-xs tracking-wider mt-2">Jump back into a quiz or review your results.</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 p-0">
              <div className="border-0 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border hover:bg-transparent">
                      <TableHead className="text-muted-foreground font-bold text-xs h-12">Topic</TableHead>
                      <TableHead className="text-muted-foreground font-bold text-xs h-12">Difficulty</TableHead>
                      <TableHead className="text-right text-muted-foreground font-bold text-xs h-12 pr-6">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingSessions ? (
                      Array.from({ length: 4 }).map((_, i) => (
                        <TableRow key={`skeleton-${i}`} className="border-border hover:bg-transparent">
                          <TableCell><Skeleton className="h-5 w-32 rounded-none bg-muted-foreground/20" /></TableCell>
                          <TableCell><Skeleton className="h-6 w-24 rounded-none bg-muted-foreground/20" /></TableCell>
                          <TableCell className="text-right pr-6"><Skeleton className="h-8 w-20 ml-auto rounded-none bg-muted-foreground/20" /></TableCell>
                        </TableRow>
                      ))
                    ) : sessions.length === 0 ? (
                      <TableRow className="border-0 hover:bg-transparent">
                        <TableCell colSpan={3} className="text-center py-12 text-muted-foreground font-medium">
                          {!session ? "Login to view your recent quizzes." : "No recent quizzes found."}
                        </TableCell>
                      </TableRow>
                    ) : (
                      sessions.map((session: QuizSession) => (
                        <TableRow key={session.id} className="border-border hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => router.push(`/quiz/${session.id}`)}>
                          <TableCell className="font-medium text-foreground truncate max-w-[150px]">{session.topic}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize bg-background border-border text-muted-foreground font-medium">{session.difficulty}</Badge>
                          </TableCell>
                          <TableCell className="text-right pr-6">
                            <Button variant="ghost" size="sm" className="text-primary hover:text-primary-foreground hover:bg-primary font-bold rounded-none px-4">
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );

}

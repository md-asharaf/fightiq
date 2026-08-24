"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BrainCircuit, Loader2 } from "lucide-react";
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

export function QuizSetupView() {
  const router = useRouter();
  const { sessions, loadingSessions, generateQuiz } = useQuizList();

  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState("intermediate");
  const [loading, setLoading] = useState(false);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
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
        <div className="border-b border-border pb-6">
          <h1 className="text-4xl font-bold tracking-tighter text-foreground">Quiz Engine</h1>
          <p className="text-muted-foreground font-medium text-sm mt-3">Test your UFC knowledge against our Generative AI.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <Card className="bg-card border-primary/20 shadow-sm rounded-none">
            <CardHeader className="border-b border-border bg-muted/30">
              <CardTitle className="flex items-center gap-3 text-2xl font-bold tracking-tighter text-foreground">
                <BrainCircuit className="h-8 w-8 text-primary" />
                Generate New Quiz
              </CardTitle>
              <CardDescription className="text-muted-foreground font-medium mt-2">
                The AI will read the knowledge base and dynamically create a 5-question quiz.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-8">
              <form id="quiz-form" onSubmit={handleGenerate} className="space-y-8">
                <div className="space-y-3">
                  <Label htmlFor="topic" className="text-xs font-bold text-muted-foreground">Topic (e.g. Khabib, UFC 300, Rules)</Label>
                  <Input
                    id="topic"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="Enter any UFC topic..."
                    required
                    className="bg-background border-border text-foreground h-12 focus-visible:ring-primary rounded-none placeholder:text-muted-foreground"
                  />
                </div>
                <div className="space-y-3">
                  <Label htmlFor="difficulty" className="text-xs font-bold text-muted-foreground">Difficulty</Label>
                  <Select value={difficulty} onValueChange={(val: string | null) => setDifficulty(val || "intermediate")}>
                    <SelectTrigger id="difficulty" className="bg-background border-border text-foreground h-12 rounded-none focus:ring-primary">
                      <SelectValue placeholder="Select difficulty" />
                    </SelectTrigger>
                    <SelectContent className="bg-background border-border text-foreground rounded-none">
                      <SelectItem value="beginner" className="focus:bg-primary focus:text-primary-foreground rounded-none cursor-pointer">Beginner</SelectItem>
                      <SelectItem value="intermediate" className="focus:bg-primary focus:text-primary-foreground rounded-none cursor-pointer">Intermediate</SelectItem>
                      <SelectItem value="expert" className="focus:bg-primary focus:text-primary-foreground rounded-none cursor-pointer">Expert</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </form>
            </CardContent>
            <CardFooter className="bg-muted/30 pt-6 border-t border-border">
              <Button type="submit" form="quiz-form" disabled={loading || !topic} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground h-14 font-bold rounded-none text-lg">
                {loading ? (
                  <>
                    <Loader2 className="mr-3 h-5 w-5 animate-spin" /> Generating...
                  </>
                ) : (
                  "Generate Quiz"
                )}
              </Button>
            </CardFooter>
          </Card>

          <Card className="bg-card border-border shadow-sm rounded-none flex flex-col">
            <CardHeader className="border-b border-border bg-muted/30">
              <CardTitle className="text-2xl font-bold tracking-tighter text-foreground">Recent Quizzes</CardTitle>
              <CardDescription className="text-muted-foreground font-medium mt-2">Jump back into a quiz or review your results.</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 p-0">
              <div className="border-0">
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
                      Array.from({ length: 3 }).map((_, i) => (
                        <TableRow key={`skeleton-${i}`} className="border-border hover:bg-transparent">
                          <TableCell><Skeleton className="h-4 w-32 rounded" /></TableCell>
                          <TableCell><Skeleton className="h-5 w-24 rounded-full" /></TableCell>
                          <TableCell className="text-right pr-6"><Skeleton className="h-8 w-16 ml-auto rounded" /></TableCell>
                        </TableRow>
                      ))
                    ) : sessions.length === 0 ? (
                      <TableRow className="border-0 hover:bg-transparent">
                        <TableCell colSpan={3} className="text-center py-12 text-muted-foreground font-medium">
                          No recent quizzes found.
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

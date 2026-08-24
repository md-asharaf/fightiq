"use client";

import { useState, useEffect } from "react";
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

export default function QuizConfigPage() {
  const router = useRouter();
  const { sessions, loadSessions, generateQuiz } = useQuizList();
  
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState("intermediate");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;

    setLoading(true);
    try {
      const sessionId = await generateQuiz(topic, difficulty);
      router.push(`/quiz/${sessionId}`);
    } catch (error: unknown) {
      if (error instanceof Error) alert("Failed to generate quiz: " + error.message);
      else alert("Failed to generate quiz: Unknown error");
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 bg-zinc-950 text-white min-h-screen">
      <div className="container mx-auto p-4 md:p-8 max-w-5xl space-y-12 pt-12 pb-32">
        <div className="border-b border-white/10 pb-6">
          <h1 className="text-4xl font-black tracking-tighter uppercase text-white">Quiz Engine</h1>
          <p className="text-zinc-400 font-medium uppercase tracking-widest text-sm mt-3">Test your UFC knowledge against our Generative AI.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <Card className="bg-black border-red-600/20 shadow-2xl rounded-none">
            <CardHeader className="border-b border-white/5 bg-zinc-900/30">
              <CardTitle className="flex items-center gap-3 text-2xl font-black uppercase tracking-tighter">
                <BrainCircuit className="h-8 w-8 text-red-600" />
                Generate New Quiz
              </CardTitle>
              <CardDescription className="text-zinc-400 font-medium mt-2">
                The AI will read the knowledge base and dynamically create a 5-question quiz.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-8">
              <form id="quiz-form" onSubmit={handleGenerate} className="space-y-8">
                <div className="space-y-3">
                  <Label htmlFor="topic" className="text-xs font-bold uppercase tracking-widest text-zinc-500">Topic (e.g. Khabib, UFC 300, Rules)</Label>
                  <Input 
                    id="topic" 
                    value={topic} 
                    onChange={(e) => setTopic(e.target.value)} 
                    placeholder="Enter any UFC topic..." 
                    required 
                    className="bg-zinc-900 border-white/10 text-white h-12 focus-visible:ring-red-600 rounded-none placeholder:text-zinc-600"
                  />
                </div>
                <div className="space-y-3">
                  <Label htmlFor="difficulty" className="text-xs font-bold uppercase tracking-widest text-zinc-500">Difficulty</Label>
                  <Select value={difficulty} onValueChange={(val) => setDifficulty(val || "intermediate")}>
                    <SelectTrigger id="difficulty" className="bg-zinc-900 border-white/10 text-white h-12 rounded-none focus:ring-red-600">
                      <SelectValue placeholder="Select difficulty" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-white/10 text-white rounded-none">
                      <SelectItem value="beginner" className="focus:bg-red-600 focus:text-white rounded-none cursor-pointer">Beginner</SelectItem>
                      <SelectItem value="intermediate" className="focus:bg-red-600 focus:text-white rounded-none cursor-pointer">Intermediate</SelectItem>
                      <SelectItem value="expert" className="focus:bg-red-600 focus:text-white rounded-none cursor-pointer">Expert</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </form>
            </CardContent>
            <CardFooter className="bg-zinc-900/30 pt-6">
              <Button type="submit" form="quiz-form" disabled={loading || !topic} className="w-full bg-red-600 hover:bg-red-700 text-white h-14 font-bold uppercase tracking-wider rounded-none text-lg">
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

          <Card className="bg-black border-white/10 shadow-2xl rounded-none flex flex-col">
            <CardHeader className="border-b border-white/5 bg-zinc-900/30">
              <CardTitle className="text-2xl font-black uppercase tracking-tighter">Recent Quizzes</CardTitle>
              <CardDescription className="text-zinc-400 font-medium mt-2">Jump back into a quiz or review your results.</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 p-0">
              <div className="border-0">
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/5 hover:bg-transparent">
                      <TableHead className="text-zinc-500 font-bold uppercase tracking-widest text-xs h-12">Topic</TableHead>
                      <TableHead className="text-zinc-500 font-bold uppercase tracking-widest text-xs h-12">Difficulty</TableHead>
                      <TableHead className="text-right text-zinc-500 font-bold uppercase tracking-widest text-xs h-12 pr-6">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sessions.length === 0 ? (
                      <TableRow className="border-0 hover:bg-transparent">
                        <TableCell colSpan={3} className="text-center py-12 text-zinc-600 font-medium">
                          No recent quizzes found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      sessions.map((session) => (
                        <TableRow key={session.id} className="border-white/5 hover:bg-zinc-900/50 transition-colors cursor-pointer" onClick={() => router.push(`/quiz/${session.id}`)}>
                          <TableCell className="font-medium text-white truncate max-w-[150px]">{session.topic}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize bg-zinc-900 border-white/10 text-zinc-300 font-medium">{session.difficulty}</Badge>
                          </TableCell>
                          <TableCell className="text-right pr-6">
                            <Button variant="ghost" size="sm" className="text-red-500 hover:text-white hover:bg-red-600 font-bold uppercase tracking-wider rounded-none px-4">
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

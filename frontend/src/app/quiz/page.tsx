"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { BrainCircuit, Loader2 } from "lucide-react";
import { fetchApi } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default function QuizConfigPage() {
  const router = useRouter();
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState("intermediate");
  const [loading, setLoading] = useState(false);
  const [sessions, setSessions] = useState<any[]>([]);

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      const data = await fetchApi("/quiz/sessions");
      setSessions(data);
    } catch (error) {
      console.error(error);
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;

    setLoading(true);
    try {
      const response = await fetchApi("/quiz/generate", {
        method: "POST",
        body: JSON.stringify({
          topic,
          difficulty,
          num_questions: 5,
        }),
      });
      router.push(`/quiz/${response.id}`);
    } catch (error: any) {
      alert("Failed to generate quiz: " + error.message);
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-8 max-w-5xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gradient">Quiz Engine</h1>
        <p className="text-muted-foreground">Test your UFC knowledge against our Generative AI.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <Card className="border-red-900/30 bg-card/60 backdrop-blur shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BrainCircuit className="h-6 w-6 text-red-500" />
              Generate New Quiz
            </CardTitle>
            <CardDescription>
              The AI will read the knowledge base and dynamically create a 5-question quiz.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form id="quiz-form" onSubmit={handleGenerate} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="topic">Topic (e.g. Khabib, UFC 300, Rules)</Label>
                <Input 
                  id="topic" 
                  value={topic} 
                  onChange={(e) => setTopic(e.target.value)} 
                  placeholder="Enter any UFC topic..." 
                  required 
                  className="bg-muted/50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="difficulty">Difficulty</Label>
                <Select value={difficulty} onValueChange={(val) => setDifficulty(val || "intermediate")}>
                  <SelectTrigger id="difficulty" className="bg-muted/50">
                    <SelectValue placeholder="Select difficulty" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">Beginner</SelectItem>
                    <SelectItem value="intermediate">Intermediate</SelectItem>
                    <SelectItem value="expert">Expert</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </form>
          </CardContent>
          <CardFooter>
            <Button type="submit" form="quiz-form" disabled={loading || !topic} className="w-full bg-red-600 hover:bg-red-700 text-white">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating (This takes a moment)...
                </>
              ) : (
                "Generate Quiz"
              )}
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Quizzes</CardTitle>
            <CardDescription>Jump back into a quiz or review your results.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Topic</TableHead>
                    <TableHead>Difficulty</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sessions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-6 text-muted-foreground">
                        No recent quizzes found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    sessions.map((session) => (
                      <TableRow key={session.id}>
                        <TableCell className="font-medium truncate max-w-[150px]">{session.topic}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">{session.difficulty}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => router.push(`/quiz/${session.id}`)}>
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
  );
}

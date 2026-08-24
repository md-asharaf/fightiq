import Link from "next/link";
import { MessageSquare, BrainCircuit, ShieldCheck, Database } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 overflow-hidden relative">
      {/* Background glow effects */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-red-900/20 rounded-full blur-[120px] pointer-events-none" />
      
      <div className="z-10 max-w-5xl w-full space-y-16 py-12">
        <div className="text-center space-y-6">
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight">
            Step into the Octagon with <br className="hidden md:block" />
            <span className="text-gradient">FightIQ</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            An advanced AI platform powered by Google Gemini, giving you real-time conversational insights and generative quizzes on UFC history, fighters, and rules.
          </p>
          <div className="flex justify-center gap-4 pt-4">
            <Link href="/chat">
              <Button size="lg" className="rounded-full font-bold px-8 bg-red-600 hover:bg-red-700 text-white border-0">
                Start Chatting
              </Button>
            </Link>
            <Link href="/quiz">
              <Button size="lg" variant="outline" className="rounded-full font-bold px-8 border-red-500/30 hover:bg-red-950/30">
                Take a Quiz
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6 pt-12">
          {features.map((feature, idx) => (
            <Link href={feature.href} key={idx}>
              <Card className="h-full bg-card/40 backdrop-blur-sm border-border/50 hover:bg-card/80 transition-all cursor-pointer group">
                <CardHeader>
                  <div className="w-12 h-12 rounded-lg bg-red-950/50 border border-red-500/20 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:border-red-500/50 transition-all">
                    <feature.icon className="w-6 h-6 text-red-500" />
                  </div>
                  <CardTitle>{feature.title}</CardTitle>
                  <CardDescription className="text-sm pt-2">{feature.desc}</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

const features = [
  {
    title: "Conversational RAG Chat",
    desc: "Ask deep questions about UFC stats, history, and rules. Powered by vector search and streaming LLM responses with source citations.",
    icon: MessageSquare,
    href: "/chat",
  },
  {
    title: "Generative Quiz Engine",
    desc: "Test your UFC knowledge. The AI dynamically generates structured quizzes based on the knowledge base.",
    icon: BrainCircuit,
    href: "/quiz",
  },
  {
    title: "Document Ingestion",
    desc: "Admin portal to upload markdown documents, trigger Wikipedia scraping, or seed predefined knowledge.",
    icon: Database,
    href: "/admin",
  },
  {
    title: "RAG Evaluation",
    desc: "View objective metrics like Faithfulness and Answer Relevancy evaluated on golden datasets.",
    icon: ShieldCheck,
    href: "/eval",
  },
];

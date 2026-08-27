import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Brain, MessageSquare, History, ShieldAlert, Zap, BarChart, Cpu } from "lucide-react";

export default function Home() {
  return (
    <div className="flex flex-col w-full">
      {/* Elevated Hero Section */}
      <section className="relative w-full py-32 md:py-48 lg:py-64 flex items-center justify-center border-b border-border bg-background overflow-hidden">
        {/* Glow Effects */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/20 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCI+PHBhdGggZD0iTTMwIDBMMzAgNjBNMCAzMEw2MCAzMCIgc3Ryb2tlPSIjZmZmZmZmIiBzdHJva2Utd2lkdGg9IjEiIGZpbGw9Im5vbmUiLz48L3N2Zz4=')]" />

        <div className="container px-4 md:px-6 mx-auto relative z-10">
          <div className="flex flex-col items-center space-y-8 text-center max-w-5xl mx-auto">
            <div className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-sm font-medium text-primary mb-4 backdrop-blur-sm">
              <Zap className="mr-2 h-4 w-4" />
              Powered by Advanced RAG Technology
            </div>
            <div className="space-y-6">
              <h1 className="text-6xl md:text-8xl lg:text-9xl font-extrabold tracking-tight text-foreground leading-[0.9]">
                Master the <br /><span className="text-primary drop-shadow-[0_0_25px_rgba(220,38,38,0.5)]">Octagon.</span>
              </h1>
              <p className="mx-auto max-w-[800px] text-muted-foreground md:text-xl lg:text-2xl font-medium tracking-wide leading-relaxed">
                The ultimate AI-powered knowledge base for Mixed Martial Arts. Analyze fights, generate dynamic quizzes, and evaluate AI accuracy in real-time.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto mt-12">
              <Link href="/chat">
                <Button size="lg" className="w-full sm:w-auto h-16 px-14 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-none text-xl transition-all hover:-translate-y-1">
                  Start Chat
                </Button>
              </Link>
              <Link href="/quiz">
                <Button size="lg" variant="outline" className="w-full sm:w-auto h-16 px-14 border-2 border-foreground text-foreground hover:bg-foreground hover:text-background font-bold rounded-none text-xl transition-all hover:-translate-y-1 bg-background/50 backdrop-blur-sm">
                  Take a Quiz
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Core Capabilities Section */}
      <section className="w-full py-24 md:py-32 bg-muted/30 relative">
        <div className="container px-4 md:px-6 mx-auto">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight text-foreground">Platform Capabilities</h2>
            <p className="text-muted-foreground font-medium text-lg max-w-2xl mx-auto">Built from the ground up to provide accurate, transparent, and engaging MMA knowledge.</p>
          </div>

          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: <MessageSquare className="h-6 w-6" />,
                title: "Intelligent MMA Chat",
                desc: "Ask complex questions about UFC history, stats, and results. Built with Retrieval-Augmented Generation (RAG) to anchor responses to actual data and prevent hallucinations. Features real-time streaming and graceful cancellation."
              },
              {
                icon: <Brain className="h-6 w-6" />,
                title: "Dynamic AI Quizzes",
                desc: "Test your knowledge on any fighter, weight class, or era. The AI engine dynamically generates multiple-choice questions based on your topic and rigorously evaluates your choices with a strict grading system."
              },
              {
                icon: <BarChart className="h-6 w-6" />,
                title: "Transparent Evaluations",
                desc: "Never blindly trust the AI. See exactly how well the engine answers questions with an integrated Ragas evaluation dashboard. View metrics on Faithfulness, Answer Relevance, and Context Precision."
              },
              {
                icon: <ShieldAlert className="h-6 w-6" />,
                title: "Role-Based Access",
                desc: "Secure authentication using BetterAuth. Standard users can chat and take quizzes, while authorized personnel have exclusive access to the Admin portal for document ingestion and AI performance monitoring."
              },
              {
                icon: <History className="h-6 w-6" />,
                title: "Persistent Sessions",
                desc: "Sign in to securely save your chat and quiz history to the PostgreSQL database. Seamlessly resume past conversations across any device with full chat context restored."
              },
              {
                icon: <Zap className="h-6 w-6" />,
                title: "Modern Architecture",
                desc: "Powered by a high-performance stack: Next.js frontend with Shadcn UI, FastAPI backend, SQLAlchemy ORM, and LangChain for advanced LLM orchestration."
              }
            ].map((feature, i) => (
              <div key={i} className="group flex flex-col space-y-4 border border-border/50 p-8 hover:border-primary/50 transition-all bg-card hover:-translate-y-1 duration-300">
                <div className="h-14 w-14 bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors rounded-sm">
                  {feature.icon}
                </div>
                <h3 className="text-2xl font-bold text-foreground tracking-tight">{feature.title}</h3>
                <p className="text-muted-foreground font-medium leading-relaxed">
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="w-full py-24 md:py-32 bg-background border-t border-border">
        <div className="container px-4 md:px-6 mx-auto max-w-4xl">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight text-foreground">Technical FAQ</h2>
            <p className="text-muted-foreground font-medium text-lg">How FightIQ actually works under the hood.</p>
          </div>

          <Accordion className="w-full space-y-4">
            <AccordionItem value="item-1" className="border border-border bg-card px-6 rounded-lg data-[state=open]:border-primary/50 transition-colors">
              <AccordionTrigger className="text-xl font-bold hover:no-underline py-6 text-left">Where does the AI get its MMA knowledge?</AccordionTrigger>
              <AccordionContent className="text-muted-foreground text-base leading-relaxed pb-6">
                FightIQ utilizes Retrieval-Augmented Generation (RAG). Admins upload factual documents (like fighter records or event histories) into the system. When you ask a question, the AI retrieves the most relevant chunks of text from our PostgreSQL vector database and uses them to construct an accurate, grounded answer, significantly reducing hallucinations.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-2" className="border border-border bg-card px-6 rounded-lg data-[state=open]:border-primary/50 transition-colors">
              <AccordionTrigger className="text-xl font-bold hover:no-underline py-6 text-left">How are the quizzes generated?</AccordionTrigger>
              <AccordionContent className="text-muted-foreground text-base leading-relaxed pb-6">
                When you specify a topic and difficulty, the backend LLM orchestrator dynamically generates a custom set of multiple-choice questions. Once you submit your answers, the engine compares your choices against the correct information and provides a detailed, AI-generated explanation for every question you answered, grading you instantly.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-3" className="border border-border bg-card px-6 rounded-lg data-[state=open]:border-primary/50 transition-colors">
              <AccordionTrigger className="text-xl font-bold hover:no-underline py-6 text-left">What happens if I click &quot;Stop Generation&quot; during a chat?</AccordionTrigger>
              <AccordionContent className="text-muted-foreground text-base leading-relaxed pb-6">
                Clicking stop triggers an AbortController in the Next.js frontend, severing the connection. The FastAPI backend catches the resulting Asyncio CancelledError, immediately halts the LLM stream, and gracefully saves the partial response to the database so your chat history remains intact without corruption.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-4" className="border border-border bg-card px-6 rounded-lg data-[state=open]:border-primary/50 transition-colors">
              <AccordionTrigger className="text-xl font-bold hover:no-underline py-6 text-left">Who can access the Evaluation and Admin dashboards?</AccordionTrigger>
              <AccordionContent className="text-muted-foreground text-base leading-relaxed pb-6">
                Access is strictly controlled via the BetterAuth Admin plugin. Only users whose accounts have been explicitly granted the &quot;admin&quot; role in the database can bypass the Next.js middleware protecting the `/admin` and `/eval` routes.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative w-full py-32 bg-card border-t border-border overflow-hidden">
        <div className="absolute inset-0 bg-primary/5 pointer-events-none" />
        <div className="container px-4 md:px-6 relative z-10 mx-auto flex flex-col items-center justify-center text-center">
          <h2 className="text-5xl md:text-7xl font-extrabold tracking-tight text-foreground mb-6">Ready to test your <span className="text-primary">FightIQ?</span></h2>
          <p className="text-xl text-muted-foreground font-medium mb-10 max-w-2xl text-center">Join the platform and see if you have what it takes to outsmart the AI.</p>
          <Link href="/signup" className="flex justify-center w-full sm:w-auto">
            <Button size="lg" className="h-16 px-16 bg-foreground hover:bg-muted-foreground text-background font-bold rounded-none text-xl transition-all hover:-translate-y-1 shadow-sm">
              Create an Account
            </Button>
          </Link>
        </div>
      </section>

      {/* Landing Footer */}
      <footer className="w-full py-12 border-t border-border bg-background">
        <div className="container px-4 md:px-6 mx-auto flex flex-col md:flex-row items-center justify-between">
          <div className="flex items-center space-x-2 mb-4 md:mb-0">
            <span className="font-extrabold text-xl tracking-tight text-foreground">
              Fight<span className="text-primary">IQ</span>
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-6">
            <span className="text-xs text-muted-foreground font-bold">Powered By</span>
            <div className="flex flex-wrap justify-center items-center gap-4 opacity-70 grayscale hover:grayscale-0 transition-all duration-300">
              {/* Next.js */}
              <div className="flex items-center space-x-2" title="Next.js">
                <Image src="https://cdn.simpleicons.org/nextdotjs/black" width={20} height={20} unoptimized className="dark:invert" alt="Next.js Logo" />
                <span className="font-semibold text-sm">Next.js</span>
              </div>
              {/* FastAPI */}
              <div className="flex items-center space-x-2" title="FastAPI">
                <Image src="https://cdn.simpleicons.org/fastapi/009688" width={24} height={24} unoptimized alt="FastAPI Logo" />
                <span className="font-semibold text-sm">FastAPI</span>
              </div>
              {/* Gemini */}
              <div className="flex items-center space-x-2" title="Google Gemini">
                <Image src="https://cdn.simpleicons.org/googlegemini/8E75B2" width={20} height={20} unoptimized alt="Gemini Logo" />
                <span className="font-semibold text-sm">Gemini</span>
              </div>
              {/* Groq */}
              <div className="flex items-center space-x-2" title="Groq">
                <Cpu className="h-5 w-5 text-[#F36633]" />
                <span className="font-semibold text-sm">Groq</span>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

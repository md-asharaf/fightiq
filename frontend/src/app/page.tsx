import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex flex-col flex-1">
      {/* Hero Section */}
      <section className="relative w-full py-24 md:py-32 lg:py-48 flex items-center justify-center border-b border-border overflow-hidden bg-background">
        <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: "url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCI+PHBhdGggZD0iTTMwIDBMMzAgNjBNMCAzMEw2MCAzMCIgc3Ryb2tlPSIjZmZmZmZmIiBzdHJva2Utd2lkdGg9IjEiIGZpbGw9Im5vbmUiLz48L3N2Zz4=')" }}></div>

        <div className="container px-4 md:px-6 relative z-10">
          <div className="flex flex-col items-center space-y-8 text-center max-w-4xl mx-auto">
            <div className="space-y-4">
              <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter text-foreground uppercase">
                Master the <br /><span className="text-primary">Octagon.</span>
              </h1>
              <p className="mx-auto max-w-[700px] text-muted-foreground md:text-xl/relaxed lg:text-2xl/relaxed font-medium uppercase tracking-wide">
                The ultimate AI-powered knowledge base for Mixed Martial Arts. Analyze fights, track statistics, and test your FightIQ.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto mt-8">
              <Link href="/chat">
                <Button size="lg" className="w-full sm:w-auto h-14 px-12 bg-primary hover:bg-primary/90 text-primary-foreground font-bold uppercase tracking-wider rounded-none text-lg">
                  Start Chat
                </Button>
              </Link>
              <Link href="/quiz">
                <Button size="lg" variant="outline" className="w-full sm:w-auto h-14 px-12 border-2 border-foreground text-foreground hover:bg-foreground hover:text-background font-bold uppercase tracking-wider rounded-none text-lg">
                  Take a Quiz
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="w-full py-20 md:py-32 bg-card">
        <div className="container px-4 md:px-6 mx-auto">
          <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-3">
            <div className="flex flex-col space-y-4 border border-border p-8 hover:border-primary transition-colors bg-background">
              <div className="h-12 w-12 bg-primary flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary-foreground"><path d="M14 9a2 2 0 0 1-2 2H6l-4 4V4c0-1.1.9-2 2-2h8a2 2 0 0 1 2 2v5Z" /><path d="M18 9h2a2 2 0 0 1 2 2v11l-4-4h-6a2 2 0 0 1-2-2v-1" /></svg>
              </div>
              <h3 className="text-2xl font-black uppercase text-foreground tracking-tight">AI Chat</h3>
              <p className="text-muted-foreground font-medium leading-relaxed">
                Ask any question about UFC history, fighter statistics, and event results. Powered by RAG and factual MMA data.
              </p>
            </div>

            <div className="flex flex-col space-y-4 border border-border p-8 hover:border-primary transition-colors bg-background">
              <div className="h-12 w-12 bg-primary flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary-foreground"><path d="M12 2v20" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
              </div>
              <h3 className="text-2xl font-black uppercase text-foreground tracking-tight">Dynamic Quizzes</h3>
              <p className="text-muted-foreground font-medium leading-relaxed">
                Generate custom AI quizzes on any fighter or weight class. Test your knowledge against the machine.
              </p>
            </div>

            <div className="flex flex-col space-y-4 border border-border p-8 hover:border-primary transition-colors bg-background">
              <div className="h-12 w-12 bg-primary flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary-foreground"><path d="M21.21 15.89A10 10 0 1 1 8 2.83" /><path d="M22 12A10 10 0 0 0 12 2v10z" /></svg>
              </div>
              <h3 className="text-2xl font-black uppercase text-foreground tracking-tight">Advanced Analytics</h3>
              <p className="text-muted-foreground font-medium leading-relaxed">
                View evaluations and correctness metrics of the AI engine using Ragas. Transparency in knowledge retrieval.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}


import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "FightIQ | UFC GenAI Platform",
  description: "AI-powered UFC knowledge base, chat, and quiz engine.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} font-sans antialiased bg-background text-foreground min-h-screen flex flex-col`}>
        {/* Navigation Bar */}
        <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container flex h-16 items-center mx-auto px-4 md:px-8">
            <a href="/" className="mr-8 flex items-center space-x-2">
              <span className="font-bold text-xl tracking-tight text-gradient">FightIQ</span>
            </a>
            <nav className="flex items-center space-x-6 text-sm font-medium ml-auto md:ml-0">
              <a href="/chat" className="transition-colors hover:text-primary text-foreground/80">Chat</a>
              <a href="/quiz" className="transition-colors hover:text-primary text-foreground/80">Quiz</a>
              <a href="/admin" className="transition-colors hover:text-primary text-foreground/80">Admin</a>
              <a href="/eval" className="transition-colors hover:text-primary text-foreground/80">Eval</a>
            </nav>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 flex flex-col">
          {children}
        </main>

        {/* Footer */}
        <footer className="py-6 border-t border-border/50 bg-muted/20">
          <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
            Built with FastAPI, Next.js, and Google Gemini
          </div>
        </footer>
      </body>
    </html>
  );
}

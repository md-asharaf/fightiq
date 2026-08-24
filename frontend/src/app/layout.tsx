import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import { Providers } from "./providers";

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
      <body className={`${inter.variable} font-sans antialiased bg-black text-foreground min-h-screen flex flex-col selection:bg-red-600 selection:text-white`}>
        <Providers>
          {/* Navigation Bar */}
          <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-black/80 backdrop-blur-md supports-[backdrop-filter]:bg-black/60 shadow-sm">
            <div className="container flex h-16 items-center mx-auto px-4 md:px-8 justify-between">
              <Link href="/" className="flex items-center space-x-2 group">
                <span className="font-black text-2xl tracking-tighter text-white uppercase group-hover:text-red-600 transition-colors duration-300">
                  Fight<span className="text-red-600 group-hover:text-white transition-colors duration-300">IQ</span>
                </span>
              </Link>
              <nav className="hidden md:flex items-center space-x-1 text-sm font-medium">
                <Link href="/chat" className="px-4 py-2 rounded-md text-zinc-400 hover:text-white hover:bg-white/5 transition-all">Chat</Link>
                <Link href="/quiz" className="px-4 py-2 rounded-md text-zinc-400 hover:text-white hover:bg-white/5 transition-all">Quiz</Link>
                <Link href="/admin" className="px-4 py-2 rounded-md text-zinc-400 hover:text-white hover:bg-white/5 transition-all">Admin</Link>
                <Link href="/eval" className="px-4 py-2 rounded-md text-zinc-400 hover:text-white hover:bg-white/5 transition-all">Eval</Link>
              </nav>
              <div className="md:hidden flex items-center space-x-4 text-sm font-medium">
                <Link href="/chat" className="text-zinc-400 hover:text-white transition-all">Chat</Link>
                <Link href="/quiz" className="text-zinc-400 hover:text-white transition-all">Quiz</Link>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 flex flex-col bg-zinc-950">
            {children}
          </main>

          {/* Footer */}
          <footer className="py-8 border-t border-white/5 bg-black">
            <div className="container mx-auto px-4 text-center text-sm font-medium tracking-wide text-zinc-600 uppercase">
              Built with FastAPI, Next.js, Google Gemini, and React Query
            </div>
          </footer>
        </Providers>
      </body>
    </html>
  );
}

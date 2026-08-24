import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import { Providers } from "./providers";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Toaster } from "sonner";
import { NavLinks } from "./NavLinks";

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
    <html lang="en" className="light">
      <body className={`${inter.variable} font-sans antialiased bg-black text-foreground min-h-screen flex flex-col selection:bg-red-600 selection:text-white`}>
        <Providers>
          {/* Navigation Bar */}
          <header className="sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60 shadow-sm">
            <div className="container flex h-16 items-center mx-auto px-4 md:px-8 justify-between">
              <Link href="/" className="flex items-center space-x-2 group">
                <span className="font-black text-2xl tracking-tighter text-white uppercase group-hover:text-red-600 transition-colors duration-300">
                  Fight<span className="text-red-600 group-hover:text-white transition-colors duration-300">IQ</span>
                </span>
              </Link>
              <nav className="hidden md:flex items-center space-x-1 text-sm font-medium">
                <NavLinks />
                <ThemeToggle />
              </nav>
              <div className="md:hidden flex items-center space-x-4 text-sm font-medium">
                <NavLinks mobile={true} />
                <ThemeToggle />
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 flex flex-col bg-background">
            {children}
          </main>

          {/* Footer */}
          <footer className="py-8 border-t border-border bg-card">
            <div className="container mx-auto px-4 text-center text-sm font-medium tracking-wide text-muted-foreground uppercase">
              Built with FastAPI, Next.js, Google Gemini, and React Query
            </div>
          </footer>
          <Toaster theme="dark" position="bottom-right" />
        </Providers>
      </body>
    </html>
  );
}

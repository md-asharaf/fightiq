import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import { Providers } from "./providers";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Toaster } from "sonner";
import { NavLinks } from "./NavLinks";

const outfit = Outfit({ subsets: ["latin"], variable: "--font-sans" });

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
    <html lang="en" className="light" suppressHydrationWarning>
      <body className={`${outfit.variable} font-sans antialiased bg-background text-foreground min-h-screen flex flex-col selection:bg-primary selection:text-primary-foreground`}>
        <Providers>
          {/* Navigation Bar */}
          <header className="sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60">
            <div className="container flex h-16 items-center mx-auto px-4 md:px-8 justify-between">
              <Link href="/" className="flex items-center space-x-2 group">
                <span className="font-black text-2xl tracking-tighter text-foreground uppercase group-hover:text-primary transition-colors duration-300">
                  Fight<span className="text-primary group-hover:text-foreground transition-colors duration-300">IQ</span>
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


          <Toaster theme="dark" position="bottom-right" />
        </Providers>
      </body>
    </html>
  );
}

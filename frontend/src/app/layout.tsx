import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { Toaster } from "@/components/ui/sonner";

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
      <body className={`${outfit.variable} font-sans antialiased bg-background text-foreground h-[100dvh] overflow-hidden flex flex-col selection:bg-primary selection:text-primary-foreground`}>
        <Providers>
          {children}
          <Toaster position="bottom-right" />
        </Providers>
      </body>
    </html>
  );
}

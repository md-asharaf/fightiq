"use client";

import Link from "next/link";
import { useSession } from "@/lib/auth-client";
import { useState } from "react";
import { Menu, X } from "lucide-react";

export function NavLinks({ mobile = false }: { mobile?: boolean }) {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);

  const isAdmin = session?.user?.role === "admin";

  const linkClass = mobile
    ? "text-muted-foreground hover:text-foreground transition-all"
    : "px-4 py-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-all";

  if (mobile) {
    return (
      <div className="relative">
        <button
          onClick={() => setOpen(!open)}
          className="p-2 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Toggle menu"
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>

        {open && (
          <div className="absolute top-full right-0 mt-4 w-48 bg-background border border-border rounded-lg shadow-sm flex flex-col py-2 z-50">
            <Link href="/chat" onClick={() => setOpen(false)} className="px-4 py-3 text-sm hover:bg-accent/50 transition-colors">Chat</Link>
            <Link href="/quiz" onClick={() => setOpen(false)} className="px-4 py-3 text-sm hover:bg-accent/50 transition-colors">Quiz</Link>
            {isAdmin && (
              <>
                <Link href="/admin" onClick={() => setOpen(false)} className="px-4 py-3 text-sm hover:bg-accent/50 transition-colors">Upload & Scrape</Link>
                <Link href="/eval" onClick={() => setOpen(false)} className="px-4 py-3 text-sm hover:bg-accent/50 transition-colors">Evaluate</Link>
              </>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <Link href="/chat" className={linkClass}>Chat</Link>
      <Link href="/quiz" className={linkClass}>Quiz</Link>
      {isAdmin && (
        <>
          <Link href="/admin" className={linkClass}>Upload & Scrape</Link>
          <Link href="/eval" className={linkClass}>Evaluate</Link>
        </>
      )}
    </>
  );
}

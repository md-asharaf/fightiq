"use client";

import Link from "next/link";
import { useSession } from "@/lib/auth-client";

export function NavLinks({ mobile = false }: { mobile?: boolean }) {
  const { data: session } = useSession();

  const isAdmin = session?.user?.role === "admin";

  const linkClass = mobile
    ? "text-muted-foreground hover:text-foreground transition-all"
    : "px-4 py-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-all";

  return (
    <>
      <Link href="/chat" className={linkClass}>Chat</Link>
      <Link href="/quiz" className={linkClass}>Quiz</Link>
      {isAdmin && (
        <>
          <Link href="/admin" className={linkClass}>Admin</Link>
          <Link href="/eval" className={linkClass}>Eval</Link>
        </>
      )}
    </>
  );
}

"use client";

import { useSession } from "@/lib/auth-client";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isPending) return;

    if (!session && pathname !== "/admin/login") {
      router.push("/admin/login");
    } else if (session && session.user.role !== "admin" && pathname !== "/admin/login") {
      router.push("/");
    } else if (session && session.user.role === "admin" && pathname === "/admin/login") {
      router.push("/admin");
    }
  }, [session, isPending, router, pathname]);

  if (isPending) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4 text-muted-foreground">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="font-semibold">Verifying Access...</p>
        </div>
      </div>
    );
  }

  if (!session && pathname !== "/admin/login") return null;
  if (session && session.user.role !== "admin" && pathname !== "/admin/login") return null;

  return <>{children}</>;
}

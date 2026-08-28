"use client";

import { useSession } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    if (isPending) return;

    if (!session || session.user.role !== "admin") {
      router.replace("/");
    } else {
      setIsAuthorized(true);
    }
  }, [session, isPending, router]);

  if (!isAuthorized) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4 text-muted-foreground">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="font-semibold uppercase tracking-wider text-sm">Verifying Access...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

"use client";

import { useSession } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function EvalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, isPending } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (isPending) return;

    if (!session || session.user.role !== "admin") {
      router.push("/admin/login");
    }
  }, [session, isPending, router]);

  if (isPending || !session || session.user.role !== "admin") {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4 text-muted-foreground">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="font-semibold">Verifying Access...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

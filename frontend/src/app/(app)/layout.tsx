import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { NavLinks } from "@/app/NavLinks";
import { Suspense } from "react";
import { cookies } from "next/headers";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get("sidebar_state")?.value !== "false";

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <Suspense fallback={null}>
        <AppSidebar />
      </Suspense>
      <SidebarInset className="flex flex-col bg-background h-[100dvh] overflow-hidden relative">
        <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b border-border bg-background/80 backdrop-blur-md px-4 shadow-sm">
          <SidebarTrigger className="-ml-1" />
          <div className="flex-1 flex justify-center gap-2">
            <div className="hidden sm:flex items-center text-sm font-semibold space-x-4">
              <NavLinks />
            </div>
          </div>
          <div className="flex items-center">
            <ThemeToggle />
          </div>
        </header>
        <main className="flex-1 overflow-y-auto min-w-0 relative">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

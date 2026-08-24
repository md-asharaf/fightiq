"use client";

import { ChatSessionPreview } from "@/types";
import { MessageSquare, PlusCircle, LogIn, Trash2 } from "lucide-react";
import { useSession } from "@/lib/auth-client";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchApi, deleteSession } from "@/lib/api";
import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { UserMenu } from "@/components/UserMenu";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuAction,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";

export function AppSidebar() {
  const { data: session, isPending: sessionLoading } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeSessionId = searchParams.get("session") || "";
  const queryClient = useQueryClient();
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);

  const { data: sessions = [], isLoading: loading } = useQuery<ChatSessionPreview[]>({
    queryKey: ["chat_sessions"],
    queryFn: async () => {
      try {
        return await fetchApi("/chat/sessions");
      } catch {
        return [];
      }
    },
    enabled: !!session && !sessionLoading,
  });

  const handleNew = () => {
    router.push("/chat");
  };

  const deleteMutation = useMutation({
    mutationFn: deleteSession,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat_sessions"] });
      if (activeSessionId === sessionToDelete) {
        router.push("/chat");
      }
      setSessionToDelete(null);
    },
    onError: (error) => {
      console.error("Failed to delete session:", error);
      setSessionToDelete(null);
    }
  });

  const confirmDelete = () => {
    if (sessionToDelete) {
      deleteMutation.mutate(sessionToDelete);
    }
  };

  return (
    <Sidebar className="border-border">
      <SidebarHeader className="h-14 flex items-center justify-center border-b border-border px-4 py-0 shrink-0 flex-row">
        <Link href="/" className="flex items-center w-full justify-center">
          <img src="/favicon.ico" alt="FightIQ Logo" className="h-10 w-auto object-contain" />
        </Link>
      </SidebarHeader>
      <SidebarContent className="px-4 pt-4">
        <Button
          onClick={handleNew}
          className="w-full bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg flex items-center justify-start gap-2 font-bold h-12 shadow-sm mb-2"
        >
          <PlusCircle className="h-5 w-5" />
          New Chat
        </Button>
        <SidebarGroup>
          <SidebarGroupLabel>Recent Chats</SidebarGroupLabel>
          <SidebarGroupContent>
            {sessionLoading ? (
              <div className="flex flex-col items-center justify-center h-40 text-center p-4">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin opacity-50 mb-3"></div>
                <p className="text-xs font-semibold text-muted-foreground animate-pulse">Checking access...</p>
              </div>
            ) : !session ? (
              <div className="flex flex-col items-center justify-center h-40 text-center p-4">
                <MessageSquare className="h-8 w-8 text-muted-foreground mb-3" />
                <p className="text-sm font-semibold text-muted-foreground mb-4">Sign in to save history</p>
                <Button
                  onClick={() => router.push("/login")}
                  variant="outline"
                  size="sm"
                  className="w-full border-border text-foreground bg-card hover:bg-accent"
                >
                  <LogIn className="h-4 w-4 mr-2" />
                  Sign In
                </Button>
              </div>
            ) : loading ? (
              <div className="text-center py-4 text-muted-foreground text-sm font-medium animate-pulse">Loading history...</div>
            ) : sessions.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground text-sm font-medium">No previous chats</div>
            ) : (
              <SidebarMenu>
                {sessions.map((s) => (
                  <SidebarMenuItem key={s.session_id}>
                    <SidebarMenuButton
                      isActive={s.session_id === activeSessionId}
                      className="p-0 hover:bg-accent hover:text-accent-foreground data-[active=true]:bg-accent data-[active=true]:text-accent-foreground transition-colors"
                    >
                      <Link href={`/chat?session=${s.session_id}`} className="w-full h-full flex items-center px-2 pr-8">
                        <span className="text-sm font-medium truncate flex-1 text-left">{s.preview_text}</span>
                      </Link>
                    </SidebarMenuButton>
                    <SidebarMenuAction 
                      showOnHover 
                      onClick={() => setSessionToDelete(s.session_id)}
                      title="Delete chat"
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive transition-colors" />
                    </SidebarMenuAction>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            )}
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4">
        <UserMenu isSidebar={true} />
      </SidebarFooter>

      <AlertDialog open={!!sessionToDelete} onOpenChange={(open) => !open && setSessionToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Chat Session?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this chat session and its history from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); confirmDelete(); }}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Sidebar>
  );
}

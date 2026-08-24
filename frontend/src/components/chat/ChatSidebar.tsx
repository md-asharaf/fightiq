import { ChatSessionPreview } from "@/types";
import { Button } from "@/components/ui/button";
import { PlusCircle, MessageSquare, LogIn } from "lucide-react";
import { useSession } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ChatSidebarProps {
  sessions: ChatSessionPreview[];
  loading: boolean;
  activeSessionId: string;
  onSelect: (id: string) => void;
  onNew: () => void;
}

export function ChatSidebar({ sessions, loading, activeSessionId, onSelect, onNew }: ChatSidebarProps) {
  const { data: session } = useSession();
  const router = useRouter();

  return (
    <div className="w-64 bg-background border-r border-border h-full flex flex-col">
      <div className="p-4 border-b border-border">
        <Button 
          onClick={onNew}
          className="w-full bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg flex items-center justify-start gap-2 font-bold uppercase tracking-wider h-12"
        >
          <PlusCircle className="h-5 w-5" />
          New Chat
        </Button>
      </div>

      <ScrollArea className="flex-1 p-3">
        <div className="space-y-2">
          {!session ? (
          <div className="flex flex-col items-center justify-center h-40 text-center p-4">
            <MessageSquare className="h-8 w-8 text-muted-foreground mb-3" />
            <p className="text-sm font-semibold text-muted-foreground mb-4">Sign in to save and view your chat history</p>
            <Button 
              onClick={() => router.push("/login")}
              variant="outline" 
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
          sessions.map((s) => (
            <button
              key={s.session_id}
              onClick={() => onSelect(s.session_id)}
              className={`w-full text-left p-3 rounded-lg flex items-start gap-3 transition-colors ${
                s.session_id === activeSessionId 
                  ? "bg-accent text-accent-foreground" 
                  : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
              }`}
            >
              <MessageSquare className="h-4 w-4 mt-0.5 shrink-0" />
              <div className="flex-1 overflow-hidden">
                <p className="text-sm font-medium truncate">{s.preview_text}</p>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">
                  {new Date(s.created_at).toLocaleDateString()}
                </p>
              </div>
            </button>
          ))
        )}
        </div>
      </ScrollArea>
    </div>
  );
}

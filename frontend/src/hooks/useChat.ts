import { useState, useRef, useCallback } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { MessageProps } from "@/components/chat/ChatMessage";
import { useSession } from "@/lib/auth-client";

// Sub-hooks
import { useGuestChat } from "./chat/useGuestChat";
import { useChatHistory } from "./chat/useChatHistory";
import { useChatSessions } from "./chat/useChatSessions";
import { useChatStream } from "./chat/useChatStream";

const generateSessionId = () => crypto.randomUUID();

export function useChat() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { data: session, isPending: sessionLoading } = useSession();

  const urlSessionId = searchParams.get("session") || "";
  const [messages, setMessages] = useState<MessageProps[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [sessionId, setSessionId] = useState(() => urlSessionId || generateSessionId());
  const abortControllerRef = useRef<AbortController | null>(null);

  const updateUrlSession = useCallback((id: string) => {
    if (pathname === "/chat") {
      router.push(`/chat?session=${id}`);
    }
  }, [pathname, router]);

  const loadSession = useCallback((id: string) => {
    updateUrlSession(id);
  }, [updateUrlSession]);

  const [prevUrlSessionId, setPrevUrlSessionId] = useState(urlSessionId);
  const [isInitializing, setIsInitializing] = useState(!!urlSessionId);

  if (urlSessionId !== prevUrlSessionId) {
    setPrevUrlSessionId(urlSessionId);
    if (urlSessionId) {
      if (urlSessionId !== sessionId) {
        setSessionId(urlSessionId);
        setIsInitializing(true);
        if (!session && !sessionLoading) {
          setMessages([{ role: "assistant", content: "Please log in to view this chat history." }]);
          setIsLoading(false);
        } else if (session) {
          setMessages([]);
          setIsLoading(true);
        }
      }
    } else {
      if (messages.length > 0) {
        setSessionId(generateSessionId());
        setMessages([]);
        setIsLoading(false);
      }
    }
  }

  // 1. Guest Chat Persistence
  useGuestChat(
    session,
    sessionLoading,
    urlSessionId,
    sessionId,
    messages,
    isLoading,
    setSessionId,
    setMessages,
    updateUrlSession
  );

  // 2. Chat History (if resuming a session)
  useChatHistory(
    isInitializing,
    sessionLoading,
    session,
    urlSessionId,
    setMessages,
    setIsLoading,
    setIsInitializing
  );

  // 3. Chat Sessions List
  const { sessions, loadingSessions } = useChatSessions(session, sessionLoading);

  // 4. Chat Streaming
  const { handleSend: handleSendStream, handleStop } = useChatStream(
    sessionId,
    setMessages,
    setIsLoading,
    abortControllerRef,
    updateUrlSession
  );

  const handleClear = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const newId = generateSessionId();
    setSessionId(newId);
    updateUrlSession(newId);
    setMessages([
      { role: "assistant", content: "Chat cleared. Start a new conversation!" }
    ]);
  }, [updateUrlSession]);

  const handleSend = useCallback((message: string | React.FormEvent) => {
    if (typeof message !== "string" && "preventDefault" in message) {
      message.preventDefault();
      return;
    }
    const textToSend = typeof message === "string" ? message : "";
    if (!textToSend.trim() || isLoading) return;
    
    handleSendStream(textToSend);
  }, [isLoading, handleSendStream]);

  return {
    messages,
    isLoading,
    sessionId,
    sessions,
    loadingSessions,
    sessionLoading,
    handleClear,
    handleSend,
    handleStop,
    loadSession
  };
}

import { useState, useRef, useEffect } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { MessageProps } from "@/components/chat/ChatMessage";
import { streamChat, fetchApi } from "@/lib/api";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChatSessionPreview } from "@/types";
import { useSession } from "@/lib/auth-client";

const generateSessionId = () => crypto.randomUUID();

export function useChat() {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { data: session, isPending: sessionLoading } = useSession();

  const urlSessionId = searchParams.get("session") || "";
  const [messages, setMessages] = useState<MessageProps[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const [sessionId, setSessionId] = useState(() => generateSessionId());
  const abortControllerRef = useRef<AbortController | null>(null);

  const updateUrlSession = (id: string) => {
    if (pathname === "/chat") {
      router.push(`/chat?session=${id}`);
    }
  };

  const loadSession = (id: string) => {
    setSessionId(id);
    updateUrlSession(id);
  };

  const [prevUrlSessionId, setPrevUrlSessionId] = useState(urlSessionId);
  const [isInitializing, setIsInitializing] = useState(false);

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

  const [hasRestored, setHasRestored] = useState(false);

  useEffect(() => {
    if (sessionLoading) return;
    
    if (!session && !urlSessionId) {
      const saved = localStorage.getItem("fightiq_guest_chat");
      if (saved) {
        try {
          const { sessionId: savedId, messages: savedMsgs } = JSON.parse(saved);
          if (savedMsgs && savedMsgs.length > 0) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setSessionId(savedId);
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setMessages(savedMsgs);
            updateUrlSession(savedId);
          }
        } catch { }
      }
    }
    setHasRestored(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionLoading]);

  useEffect(() => {
    if (!hasRestored || sessionLoading) return;
    
    if (session) {
      localStorage.removeItem("fightiq_guest_chat");
      return;
    }
    
    const isErrorState = messages.length === 1 && messages[0].content.includes("Please log in to view");
    if (isErrorState) return;

    if (messages.length > 0) {
      localStorage.setItem("fightiq_guest_chat", JSON.stringify({ sessionId, messages }));
    } else if (messages.length === 0 && !isLoading && !urlSessionId) {
      localStorage.removeItem("fightiq_guest_chat");
    }
  }, [messages, sessionId, session, sessionLoading, isLoading, hasRestored, urlSessionId]);

  useEffect(() => {
    if (!isInitializing || sessionLoading || !session || !urlSessionId) return;

    let ignore = false;
    const fetchHistory = async () => {
      try {
        const history = await fetchApi(`/chat/history/${urlSessionId}`);
        if (ignore) return;
        if (history.messages) {
          setMessages(history.messages);
        }
      } catch (err) {
        console.error(err);
        if (!ignore) {
          setMessages([{ role: "assistant", content: "Failed to load chat history." }]);
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
          setIsInitializing(false);
        }
      }
    };

    fetchHistory();
    return () => { ignore = true; };
  }, [isInitializing, urlSessionId, session, sessionLoading]);

  const { data: sessions = [], isLoading: loadingSessions } = useQuery<ChatSessionPreview[]>({
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

  const handleClear = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const newId = generateSessionId();
    setSessionId(newId);
    updateUrlSession(newId);
    setMessages([
      { role: "assistant", content: "Chat cleared. Start a new conversation!" }
    ]);
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsLoading(false);
  };

  const handleSend = async (e?: React.FormEvent | string) => {
    if (e && typeof e !== "string" && "preventDefault" in e) e.preventDefault();

    const textToSend = typeof e === "string" ? e : input;
    if (!textToSend.trim() || isLoading) return;

    const userMessage = textToSend.trim();
    if (typeof e !== "string") setInput("");

    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    setMessages(prev => [...prev, { role: "assistant", content: "" }]);

    abortControllerRef.current = new AbortController();

    await streamChat(sessionId, userMessage, {
      onChunk: (content) => {
        setMessages(prev => {
          const newMsgs = [...prev];
          newMsgs[newMsgs.length - 1] = { ...newMsgs[newMsgs.length - 1], content };
          return newMsgs;
        });
      },
      onSources: (sources) => {
        setMessages(prev => {
          const newMsgs = [...prev];
          const lastMsg = newMsgs[newMsgs.length - 1];
          const existingSources = lastMsg.sources || [];
          newMsgs[newMsgs.length - 1] = { ...lastMsg, sources: [...existingSources, ...sources] };
          return newMsgs;
        });
      },
      onError: (error) => {
        console.error(error);
        setMessages(prev => {
          const newMsgs = [...prev];
          newMsgs[newMsgs.length - 1].content = "Sorry, an error occurred while generating the response.";
          return newMsgs;
        });
      },
      onComplete: () => {
        setIsLoading(false);
        abortControllerRef.current = null;
        queryClient.invalidateQueries({ queryKey: ["chat_sessions"] });
        updateUrlSession(sessionId);
      }
    }, abortControllerRef.current.signal);
  };

  return {
    messages,
    input,
    setInput,
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

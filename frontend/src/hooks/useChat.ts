import { useState, useEffect, useRef } from "react";
import { MessageProps } from "@/components/chat/ChatMessage";
import { streamChat, fetchApi } from "@/lib/api";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChatSessionPreview } from "@/types";

const generateSessionId = () => crypto.randomUUID();

export function useChat() {
  const queryClient = useQueryClient();
  const [messages, setMessages] = useState<MessageProps[]>([
    { role: "assistant", content: "Welcome to FightIQ! Ask me anything about UFC fighters, events, history, or rules." }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState(generateSessionId);
  const abortControllerRef = useRef<AbortController | null>(null);

  const { data: sessions = [], isLoading: loadingSessions } = useQuery<ChatSessionPreview[]>({
    queryKey: ["chat_sessions"],
    queryFn: async () => {
      try {
        return await fetchApi("/chat/sessions");
      } catch (err) {
        return [];
      }
    },
  });

  const loadSession = async (id: string) => {
    setSessionId(id);
    setIsLoading(true);
    try {
      const history = await fetchApi(`/chat/history/${id}`);
      if (history.messages && history.messages.length > 0) {
        setMessages(history.messages);
      }
    } catch (err) {
      console.error(err);
      setMessages([{ role: "assistant", content: "Failed to load chat history." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setSessionId(generateSessionId());
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

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");

    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    setMessages(prev => [...prev, { role: "assistant", content: "" }]);

    abortControllerRef.current = new AbortController();

    await streamChat(sessionId, userMessage, {
      onChunk: (content) => {
        setMessages(prev => {
          const newMsgs = [...prev];
          newMsgs[newMsgs.length - 1].content = content;
          return newMsgs;
        });
      },
      onSources: (sources) => {
        setMessages(prev => {
          const newMsgs = [...prev];
          newMsgs[newMsgs.length - 1].sources = sources;
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
    handleClear,
    handleSend,
    handleStop,
    loadSession
  };
}

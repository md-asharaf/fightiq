import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { MessageProps } from "@/components/chat/ChatMessage";
import { streamChat } from "@/lib/api";

export function useChatStream(
  sessionId: string,
  setMessages: React.Dispatch<React.SetStateAction<MessageProps[]>>,
  setIsLoading: (loading: boolean) => void,
  abortControllerRef: React.MutableRefObject<AbortController | null>,
  updateUrlSession: (id: string) => void
) {
  const queryClient = useQueryClient();

  const handleSend = useCallback(async (textToSend: string) => {
    const userMessage = textToSend.trim();

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
        setMessages(prev => {
          const newMsgs = [...prev];
          const lastMsg = newMsgs[newMsgs.length - 1];
          if (lastMsg.role === "assistant" && !lastMsg.content.trim()) {
            lastMsg.content = "Sorry, I couldn't generate a response. Please try again.";
          }
          return newMsgs;
        });
        setIsLoading(false);
        abortControllerRef.current = null;
        queryClient.invalidateQueries({ queryKey: ["chat_sessions"] });
        updateUrlSession(sessionId);
      }
    }, abortControllerRef.current.signal);
  }, [sessionId, setMessages, setIsLoading, abortControllerRef, updateUrlSession, queryClient]);

  const handleStop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsLoading(false);
  }, [abortControllerRef, setIsLoading]);

  return { handleSend, handleStop };
}

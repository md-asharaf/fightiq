import { useCallback, useRef, useEffect } from "react";
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
  const fullContentRef = useRef("");
  const displayedContentRef = useRef("");
  const isStreamCompleteRef = useRef(false);
  const typewriterIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (typewriterIntervalRef.current) clearInterval(typewriterIntervalRef.current);
    };
  }, []);

  const handleSend = useCallback(async (textToSend: string) => {
    const userMessage = textToSend.trim();

    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    setMessages(prev => [...prev, { role: "assistant", content: "" }]);

    fullContentRef.current = "";
    displayedContentRef.current = "";
    isStreamCompleteRef.current = false;

    if (typewriterIntervalRef.current) clearInterval(typewriterIntervalRef.current);

    typewriterIntervalRef.current = setInterval(() => {
      const full = fullContentRef.current;
      const displayed = displayedContentRef.current;

      if (displayed.length < full.length) {
        const remaining = full.length - displayed.length;
        // Dynamically type faster if the buffer is huge so it doesn't fall too far behind
        const charsToAdd = Math.max(3, Math.ceil(remaining / 10)); 
        displayedContentRef.current = full.substring(0, displayed.length + charsToAdd);
        
        setMessages(prev => {
          const newMsgs = [...prev];
          newMsgs[newMsgs.length - 1] = { ...newMsgs[newMsgs.length - 1], content: displayedContentRef.current };
          return newMsgs;
        });
      } else if (isStreamCompleteRef.current) {
        if (typewriterIntervalRef.current) {
          clearInterval(typewriterIntervalRef.current);
          typewriterIntervalRef.current = null;
        }
        setIsLoading(false);
      }
    }, 20);

    abortControllerRef.current = new AbortController();

    await streamChat(sessionId, userMessage, {
      onChunk: (content) => {
        fullContentRef.current = content;
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
        isStreamCompleteRef.current = true;
        setMessages(prev => {
          const newMsgs = [...prev];
          newMsgs[newMsgs.length - 1].content = displayedContentRef.current + "\n\n*(Error generating full response)*";
          return newMsgs;
        });
      },
      onComplete: () => {
        isStreamCompleteRef.current = true;
        
        setMessages(prev => {
          const newMsgs = [...prev];
          const lastMsg = newMsgs[newMsgs.length - 1];
          if (lastMsg.role === "assistant" && !fullContentRef.current.trim()) {
            lastMsg.content = "Sorry, I couldn't generate a response. Please try again.";
          }
          return newMsgs;
        });
        
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
    isStreamCompleteRef.current = true;
    fullContentRef.current = displayedContentRef.current;
    
    if (typewriterIntervalRef.current) {
      clearInterval(typewriterIntervalRef.current);
      typewriterIntervalRef.current = null;
    }
    setIsLoading(false);
  }, [abortControllerRef, setIsLoading]);

  return { handleSend, handleStop };
}

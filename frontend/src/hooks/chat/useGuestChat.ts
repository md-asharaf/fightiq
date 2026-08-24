import { useEffect, useState } from "react";
import { MessageProps } from "@/components/chat/ChatMessage";

export function useGuestChat(
  session: unknown,
  sessionLoading: boolean,
  urlSessionId: string,
  sessionId: string,
  messages: MessageProps[],
  isLoading: boolean,
  setSessionId: (id: string) => void,
  setMessages: (msgs: MessageProps[]) => void,
  updateUrlSession: (id: string) => void
) {
  const [hasRestored, setHasRestored] = useState(false);

  useEffect(() => {
    if (sessionLoading) return;

    if (!session && !urlSessionId) {
      const saved = localStorage.getItem("fightiq_guest_chat");
      if (saved) {
        try {
          const { sessionId: savedId, messages: savedMsgs } = JSON.parse(saved);
          if (savedMsgs && savedMsgs.length > 0) {
            setTimeout(() => {
              setSessionId(savedId);
              setMessages(savedMsgs);
              updateUrlSession(savedId);
            }, 0);
          }
        } catch (e) {
          console.debug("Failed to parse guest chat from local storage:", e);
        }
      }
    }

    setTimeout(() => setHasRestored(true), 0);
  }, [sessionLoading, session, urlSessionId, setSessionId, setMessages, updateUrlSession]);

  // Save to local storage on updates
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

  return { hasRestored };
}

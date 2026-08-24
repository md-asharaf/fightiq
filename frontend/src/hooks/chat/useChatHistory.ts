import { useEffect } from "react";
import { MessageProps } from "@/components/chat/ChatMessage";
import { fetchApi } from "@/lib/api";

export function useChatHistory(
  isInitializing: boolean,
  sessionLoading: boolean,
  session: unknown,
  urlSessionId: string,
  setMessages: (msgs: MessageProps[]) => void,
  setIsLoading: (loading: boolean) => void,
  setIsInitializing: (init: boolean) => void
) {
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
  }, [isInitializing, urlSessionId, session, sessionLoading, setMessages, setIsLoading, setIsInitializing]);
}

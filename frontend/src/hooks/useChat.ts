import { useState, useEffect } from "react";
import { MessageProps } from "@/components/chat/ChatMessage";
import { streamChat } from "@/lib/api";

const generateSessionId = () => `sess_${Math.random().toString(36).substr(2, 9)}`;

export function useChat() {
  const [messages, setMessages] = useState<MessageProps[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState("");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSessionId(generateSessionId());

    setMessages([
      { role: "assistant", content: "Welcome to FightIQ! Ask me anything about UFC fighters, events, history, or rules." }
    ]);
  }, []);

  const handleClear = () => {
    setSessionId(generateSessionId());
    setMessages([
      { role: "assistant", content: "Chat cleared. Start a new conversation!" }
    ]);
  };

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");

    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    setMessages(prev => [...prev, { role: "assistant", content: "" }]);

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
      }
    });
  };

  return {
    messages,
    input,
    setInput,
    isLoading,
    sessionId,
    handleClear,
    handleSend
  };
}

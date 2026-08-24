"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Trash2 } from "lucide-react";
import { ChatMessage, MessageProps } from "@/components/chat/ChatMessage";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { ChatSource } from "@/types";

const generateSessionId = () => `sess_${Math.random().toString(36).substr(2, 9)}`;

export default function ChatPage() {
  const [messages, setMessages] = useState<MessageProps[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSessionId(generateSessionId());

    setMessages([
      { role: "assistant", content: "Welcome to FightIQ! Ask me anything about UFC fighters, events, history, or rules." }
    ]);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

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

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api"}/chat/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          message: userMessage,
        }),
      });

      if (!response.ok) throw new Error("Failed to connect to chat API");
      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");

      let fullContent = "";
      let sources: ChatSource[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const dataStr = line.replace("data: ", "").trim();
            if (dataStr === "[DONE]") {
              continue;
            }
            try {
              const data = JSON.parse(dataStr);
              if (data.type === "chunk") {
                fullContent += data.content;
                setMessages(prev => {
                  const newMsgs = [...prev];
                  newMsgs[newMsgs.length - 1].content = fullContent;
                  return newMsgs;
                });
              } else if (data.type === "sources") {
                sources = data.sources;
                setMessages(prev => {
                  const newMsgs = [...prev];
                  newMsgs[newMsgs.length - 1].sources = sources;
                  return newMsgs;
                });
              }
            } catch {
            }
          }
        }
      }
    } catch (error) {
      console.error(error);
      setMessages(prev => {
        const newMsgs = [...prev];
        newMsgs[newMsgs.length - 1].content = "Sorry, an error occurred while generating the response.";
        return newMsgs;
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-8 flex-1 flex flex-col h-[calc(100vh-4rem)] max-w-4xl">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gradient">FightIQ Assistant</h1>
          <p className="text-sm text-muted-foreground">Conversational RAG connected to UFC knowledge.</p>
        </div>
        <Button variant="ghost" size="icon" onClick={handleClear} title="Clear Chat">
          <Trash2 className="h-5 w-5 text-muted-foreground hover:text-destructive transition-colors" />
        </Button>
      </div>

      <Card className="flex-1 flex flex-col overflow-hidden border-border/50 bg-card/50 backdrop-blur-sm shadow-xl">
        <ScrollArea className="flex-1 p-4">
          <div className="flex flex-col space-y-4">
            {messages.map((msg, idx) => (
              <ChatMessage key={idx} {...msg} />
            ))}
            {isLoading && messages[messages.length - 1]?.role === "user" && (
              <div className="text-sm text-muted-foreground flex items-center ml-2">
                <span className="flex space-x-1">
                  <span className="animate-bounce delay-75">.</span>
                  <span className="animate-bounce delay-150">.</span>
                  <span className="animate-bounce delay-300">.</span>
                </span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        <div className="p-4 bg-background border-t border-border/50">
          <form onSubmit={handleSend} className="flex space-x-2">
            <Input
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Ask about UFC rules, fighters, or history..."
              disabled={isLoading}
              className="flex-1 bg-muted/50 border-border/50 focus-visible:ring-red-500"
            />
            <Button type="submit" disabled={isLoading || !input.trim()} className="bg-red-600 hover:bg-red-700 text-white shadow-md">
              <Send className="h-4 w-4" />
              <span className="sr-only">Send</span>
            </Button>
          </form>
        </div>
      </Card>
    </div>
  );
}

"use client";

import { useRef, useEffect } from "react";
import { Send, Trash2 } from "lucide-react";
import { ChatMessage } from "@/components/chat/ChatMessage";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { useChat } from "@/hooks/useChat";

export default function ChatPage() {
  const {
    messages,
    input,
    setInput,
    isLoading,
    handleClear,
    handleSend
  } = useChat();

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

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

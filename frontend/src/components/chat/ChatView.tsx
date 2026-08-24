"use client";

import { useRef, useEffect } from "react";
import { Send, StopCircle } from "lucide-react";
import { ChatMessage } from "@/components/chat/ChatMessage";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useChat } from "@/hooks/useChat";
import { ChatInput } from "@/components/chat/ChatInput";

export function ChatView() {
  const {
    messages,
    isLoading,
    sessionLoading,
    handleSend,
    handleStop,
  } = useChat();

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  return (
    <div className="flex-1 flex flex-col relative h-full w-full bg-background">
      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto pb-40 px-4 md:px-0">
        <div className="flex flex-col w-full max-w-3xl mx-auto pt-8">
          {(isLoading || sessionLoading) && messages.length === 0 && (
            <div className="flex flex-col items-center justify-center mt-32 space-y-4">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin opacity-80"></div>
              <p className="text-sm font-semibold text-muted-foreground animate-pulse">Loading conversation...</p>
            </div>
          )}

          {messages.length === 0 && !isLoading && !sessionLoading && (
            <div className="flex flex-col items-center justify-center mt-20 space-y-8">
              <div className="flex flex-col items-center text-center space-y-4 opacity-80">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-2">
                  <img src="/favicon.ico" alt="FightIQ Logo" className="h-10 w-auto object-contain" />
                </div>
                <h2 className="text-xl font-bold text-foreground tracking-tight">How can I help you?</h2>
                <p className="text-sm text-muted-foreground">Ask me about UFC history, fighter stats, or unified rules.</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-xl mt-4">
                {[
                  "Analyze Jon Jones's striking metrics",
                  "Explain the judging criteria for a 10-8 round",
                  "Who holds the record for most title defenses?",
                  "Compare the stats of Khabib and Conor"
                ].map((suggestion, i) => (
                  <Button
                    key={i}
                    variant="outline"
                    onClick={() => handleSend(suggestion)}
                    className="h-auto py-3 px-4 text-left justify-start font-medium text-xs text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors whitespace-normal"
                  >
                    {suggestion}
                  </Button>
                ))}
              </div>
            </div>
          )}
          {messages.map((msg, idx) => {
            if (isLoading && idx === messages.length - 1 && msg.role === "assistant" && !msg.content) {
              return null;
            }
            return <ChatMessage key={idx} {...msg} />;
          })}
          {isLoading && messages[messages.length - 1]?.role === "assistant" && !messages[messages.length - 1]?.content && (
            <div className="w-full py-8 flex justify-center border-b border-border bg-card">
              <div className="flex w-full max-w-3xl space-x-6 px-4">
                <div className="shrink-0 flex flex-col items-center mt-1">
                  <div className="w-8 h-8 shadow-sm overflow-visible relative flex items-center justify-center rounded-full">
                    <img src="/favicon.ico" alt="FightIQ Logo" className="h-8 w-auto object-contain animate-pulse" />
                  </div>
                </div>
                <div className="flex items-center text-sm font-medium text-muted-foreground pt-1">
                  Thinking...
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <ChatInput isLoading={isLoading} onSend={handleSend} onStop={handleStop} />
    </div>
  );
}

"use client";

import { useRef, useEffect } from "react";
import { Send, StopCircle } from "lucide-react";
import { ChatMessage } from "@/components/chat/ChatMessage";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useChat } from "@/hooks/useChat";

export function ChatView() {
  const {
    messages,
    input,
    setInput,
    isLoading,
    sessionLoading,
    handleSend,
    handleStop,
  } = useChat();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  useEffect(() => {
    if (input === "" && textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }, [input]);

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (input.trim() && !isLoading) {
        handleSend(e as unknown as React.FormEvent);
      }
    }
  };

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

      {/* Input Area (Claude-style floating pill) */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-background via-background to-transparent pt-10 pb-8 px-4">
        <div className="max-w-3xl mx-auto">
          <form
            onSubmit={handleSend}
            className="relative flex items-end shadow rounded-full border border-border bg-card overflow-hidden focus-within:ring-1 focus-within:ring-primary/50 transition-all"
          >
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              placeholder="Message FightIQ..."
              disabled={isLoading}
              rows={1}
              className="flex-1 bg-transparent border-0 focus-visible:ring-0 shadow-none px-4 py-4 text-base resize-none text-foreground placeholder:text-muted-foreground min-h-[56px] max-h-[200px]"
            />
            <div className="p-2">
              {isLoading ? (
                <Button
                  type="button"
                  onClick={handleStop}
                  size="icon"
                  className="h-10 w-10 rounded-xl transition-all bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  title="Stop generating"
                >
                  <StopCircle className="h-5 w-5" />
                  <span className="sr-only">Stop</span>
                </Button>
              ) : (
                <Button
                  type="submit"
                  disabled={!input.trim()}
                  size="icon"
                  className={`h-10 w-10 rounded-xl transition-all ${input.trim() ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'bg-accent text-muted-foreground hover:bg-accent'}`}
                >
                  <Send className="h-4 w-4 ml-1" />
                  <span className="sr-only">Send</span>
                </Button>
              )}
            </div>
          </form>
          <div className="text-center mt-4 text-[12px] font-semibold text-muted-foreground opacity-70">
            FightIQ can make mistakes. Verify important information.
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useRef, useEffect } from "react";
import { Send, Trash2, StopCircle, Swords } from "lucide-react";
import { ChatMessage } from "@/components/chat/ChatMessage";
import { ChatSidebar } from "@/components/chat/ChatSidebar";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useChat } from "@/hooks/useChat";

export function ChatView() {
  const {
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
  } = useChat();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

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
    <div className="flex h-[calc(100vh-4rem)] w-full overflow-hidden bg-background">
      <div className="hidden md:block">
        <ChatSidebar 
          sessions={sessions} 
          loading={loadingSessions} 
          activeSessionId={sessionId} 
          onSelect={loadSession} 
          onNew={handleClear} 
        />
      </div>
      <div className="flex-1 flex flex-col relative min-w-0">
        {/* Header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border px-6 py-4 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-3">
          <div className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
          </div>
          <h1 className="text-xl font-black tracking-tighter text-foreground uppercase drop-shadow-md">
            FightIQ Chat
          </h1>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleClear} 
          title="Clear Chat" 
          className="text-muted-foreground border-border bg-accent/50 hover:text-destructive hover:bg-destructive/10 hover:border-destructive transition-all flex items-center gap-2 rounded-full px-4"
        >
          <Trash2 className="h-4 w-4" />
          <span className="text-xs font-semibold uppercase tracking-wider hidden sm:inline">Clear Session</span>
        </Button>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto pb-40 px-4 md:px-0">
        <div className="flex flex-col w-full max-w-3xl mx-auto pt-8">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center text-center mt-20 space-y-4 opacity-50">
              <div className="w-16 h-16 rounded-2xl bg-accent border border-border flex items-center justify-center mb-2">
                <Swords className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-xl font-bold text-foreground tracking-tight">How can I help you?</h2>
              <p className="text-sm text-muted-foreground">Ask me about UFC history, fighter stats, or unified rules.</p>
            </div>
          )}
          {messages.map((msg, idx) => (
            <ChatMessage key={idx} {...msg} />
          ))}
          {isLoading && messages[messages.length - 1]?.role === "user" && (
            <div className="w-full py-6 flex">
              <div className="flex w-full space-x-6">
                <div className="shrink-0 w-8 h-8 rounded-md bg-primary flex items-center justify-center shadow-sm">
                  <div className="w-2 h-2 rounded-full bg-primary-foreground animate-ping" />
                </div>
                <div className="flex items-center text-sm font-medium text-muted-foreground">
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
            className="relative flex items-end shadow-xl rounded-2xl border border-border bg-card overflow-hidden focus-within:ring-1 focus-within:ring-primary/50 transition-all"
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
          <div className="text-center mt-4 text-[10px] font-semibold tracking-widest text-muted-foreground uppercase opacity-70">
            FightIQ can make mistakes. Verify important information.
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}

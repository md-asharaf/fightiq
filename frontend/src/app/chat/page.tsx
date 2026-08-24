"use client";

import { useRef, useEffect } from "react";
import { Send, Trash2, StopCircle } from "lucide-react";
import { ChatMessage } from "@/components/chat/ChatMessage";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
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
    <div className="flex flex-col h-[calc(100vh-4rem)] relative bg-zinc-950">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-zinc-950/80 backdrop-blur-md border-b border-white/5 px-4 py-3 flex justify-between items-center">
        <div>
          <h1 className="text-lg font-black tracking-tighter text-white uppercase flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></span>
            FightIQ Chat
          </h1>
        </div>
        <Button variant="ghost" size="icon" onClick={handleClear} title="Clear Chat" className="text-zinc-500 hover:text-red-500 hover:bg-red-500/10">
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto pb-40 px-4 md:px-0">
        <div className="flex flex-col w-full max-w-3xl mx-auto pt-8">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center text-center mt-20 space-y-4 opacity-50">
              <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-white/5 flex items-center justify-center mb-2">
                <span className="text-3xl">🥋</span>
              </div>
              <h2 className="text-xl font-bold text-white tracking-tight">How can I help you?</h2>
              <p className="text-sm text-zinc-400">Ask me about UFC history, fighter stats, or unified rules.</p>
            </div>
          )}
          {messages.map((msg, idx) => (
            <ChatMessage key={idx} {...msg} />
          ))}
          {isLoading && messages[messages.length - 1]?.role === "user" && (
            <div className="w-full py-6 flex">
              <div className="flex w-full space-x-6">
                <div className="shrink-0 w-8 h-8 rounded-md bg-red-600 flex items-center justify-center shadow-sm">
                  <div className="w-2 h-2 rounded-full bg-white animate-ping" />
                </div>
                <div className="flex items-center text-sm font-medium text-zinc-400">
                  Thinking...
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area (Claude-style floating pill) */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-zinc-950 via-zinc-950 to-transparent pt-10 pb-8 px-4">
        <div className="max-w-3xl mx-auto">
          <form
            onSubmit={handleSend}
            className="relative flex items-end shadow-xl rounded-2xl border border-white/10 bg-zinc-900 overflow-hidden focus-within:ring-1 focus-within:ring-red-500/50 transition-all"
          >
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              placeholder="Message FightIQ..."
              disabled={isLoading}
              rows={1}
              className="flex-1 bg-transparent border-0 focus-visible:ring-0 shadow-none px-4 py-4 text-base resize-none text-white placeholder:text-zinc-500 min-h-[56px] max-h-[200px]"
            />
            <div className="p-2">
              <Button
                type="submit"
                disabled={isLoading || !input.trim()}
                size="icon"
                className={`h-10 w-10 rounded-xl transition-all ${input.trim() ? 'bg-white text-black hover:bg-zinc-200' : 'bg-zinc-800 text-zinc-600 hover:bg-zinc-800'}`}
              >
                {isLoading ? <StopCircle className="h-5 w-5 animate-pulse" /> : <Send className="h-4 w-4 ml-1" />}
                <span className="sr-only">Send</span>
              </Button>
            </div>
          </form>
          <div className="text-center mt-3 text-[11px] font-medium tracking-wide text-zinc-600 uppercase">
            FightIQ can make mistakes. Verify important information.
          </div>
        </div>
      </div>
    </div>
  );
}

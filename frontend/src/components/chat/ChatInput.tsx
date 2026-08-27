"use client";

import { useState, useRef, useEffect } from "react";
import { Send, StopCircle } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

interface ChatInputProps {
  isLoading: boolean;
  onSend: (message: string) => void;
  onStop: () => void;
}

export function ChatInput({ isLoading, onSend, onStop }: ChatInputProps) {
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
        onSend(input);
        setInput("");
      }
    }
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      onSend(input);
      setInput("");
    }
  };

  return (
    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-background via-background to-transparent pt-10 pb-4 md:pb-8 px-4 md:px-6">
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
                onClick={onStop}
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
        <div className="text-center mt-3 md:mt-4 text-[10px] md:text-[12px] font-semibold text-muted-foreground opacity-70">
          FightIQ can make mistakes. Verify important information.
        </div>
      </div>
    </div>
  );
}

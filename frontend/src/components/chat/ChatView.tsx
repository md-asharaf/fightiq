"use client";

import { useRef, useEffect } from "react";
import { ChatMessage } from "@/components/chat/ChatMessage";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { useChat } from "@/hooks/useChat";
import { ChatInput } from "@/components/chat/ChatInput";
import { Share2 } from "lucide-react";
import { useShareChatAction } from "@/hooks/chat/useShareChatAction";
import { motion } from "framer-motion";

export function ChatView() {
  const {
    messages,
    isLoading,
    sessionLoading,
    handleSend,
    handleStop,
    sessionId
  } = useChat();

  const { mutate: shareChat, isPending: isSharing } = useShareChatAction();

  const handleShare = () => {
    if (sessionId) shareChat(sessionId);
  };

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  return (
    <div className="flex-1 flex flex-col relative h-full w-full bg-background">
      {/* Optional Top Header for Share */}
      {messages.length > 0 && !sessionLoading && (
        <div className="absolute top-0 right-0 z-10 p-4">
          <Button
            variant="outline"
            size="sm"
            onClick={handleShare}
            disabled={isSharing}
            className="flex items-center gap-2 bg-card/80 backdrop-blur-sm border-border hover:bg-muted"
          >
            <Share2 className="h-4 w-4 md:h-5 md:w-5" />
            <span className="hidden sm:inline">{isSharing ? "Sharing..." : "Share Chat"}</span>
          </Button>
        </div>
      )}

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto pb-32">
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
                <div className="w-12 h-12 md:w-16 md:h-16 rounded-2xl flex items-center justify-center mb-2">
                  <Image src="/favicon.ico" alt="FightIQ Logo" width={80} height={40} className="object-contain w-full h-full" />
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
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full flex justify-start mb-6 px-4 md:px-0"
            >
              <div className="flex w-full max-w-3xl justify-start space-x-4 md:space-x-6">
                <div className="shrink-0 flex flex-col items-center mt-1">
                  <div className="w-8 h-8 md:w-10 md:h-10 shadow-sm overflow-visible relative flex items-center justify-center rounded-full">
                    <Image src="/favicon.ico" alt="FightIQ Logo" width={80} height={40} className="object-contain animate-pulse opacity-70 w-full h-full" />
                  </div>
                </div>
                <div className="flex flex-1 items-center">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                    <div className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                    <div className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce"></div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <ChatInput isLoading={isLoading} onSend={handleSend} onStop={handleStop} />
    </div>
  );
}

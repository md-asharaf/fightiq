"use client";

import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import React from "react";
import Image from "next/image";
import { ExternalLink, FileText } from "lucide-react";
import { ChatSource } from "@/types";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useSession } from "@/lib/auth-client";
import { Badge } from "@/components/ui/badge";

export interface MessageProps {
  role: "user" | "assistant";
  content: string;
  sources?: ChatSource[];
}

export const ChatMessage = React.memo(function ChatMessage({ role, content, sources }: MessageProps) {
  const { data: session } = useSession();
  const isUser = role === "user";
  const userName = session?.user?.name || "User";
  const initials = userName.substring(0, 2).toUpperCase();

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className={`w-full py-6 md:py-8 flex justify-center border-b border-border ${isUser ? 'bg-background' : 'bg-card'}`}
    >
      <div className="flex w-full max-w-3xl space-x-4 md:space-x-6 px-4 md:px-6">
        {/* Avatar */}
        <div className="shrink-0 flex flex-col items-center mt-1">
          <Avatar className="w-8 h-8 shadow-sm overflow-visible">
            {isUser ? (
              <>
                <AvatarImage src={session?.user?.image || ""} alt={userName} />
                <AvatarFallback className="bg-primary text-primary-foreground font-semibold text-xs rounded-md w-8 h-8 flex items-center justify-center">
                  {initials}
                </AvatarFallback>
              </>
            ) : (
              <Image src="/favicon.ico" alt="FightIQ Logo" width={32} height={32} className="object-contain" />
            )}
          </Avatar>
        </div>

        {/* Message Content */}
        <div className="flex-1 min-w-0 pt-0 md:pt-1">
          <div className="prose prose-sm md:prose-base dark:prose-invert max-w-none prose-p:leading-relaxed prose-p:text-foreground prose-headings:text-foreground prose-a:text-primary hover:prose-a:text-primary/80 prose-strong:text-foreground prose-strong:font-bold">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
          </div>

          {/* Source Citations */}
          {!isUser && sources && sources.length > 0 && (() => {
            const uniqueSources = Array.from(new Map(sources.map(s => [s.source || s.title, s])).values());
            return (
              <div className="mt-6 pt-4 border-t border-border/50">
                <div className="flex flex-wrap gap-2 items-center">
                  <span className="text-[11px] font-semibold tracking-wider text-muted-foreground mr-1">SOURCES:</span>
                  {uniqueSources.map((s, idx) => {
                    const isLink = s.source && s.source.startsWith("http");
                    return (
                      <a
                        key={idx}
                        href={isLink ? s.source : undefined}
                        target={isLink ? "_blank" : undefined}
                        rel={isLink ? "noopener noreferrer" : undefined}
                        className={!isLink ? "cursor-default pointer-events-none" : ""}
                        title={s.title}
                      >
                        <Badge variant="outline" className="flex items-center gap-1.5 rounded-full bg-muted/30 hover:bg-muted/80 text-[11px] text-foreground/80 font-normal py-1 px-2.5 transition-colors border-border/60">
                          {isLink ? <ExternalLink className="w-3 h-3 text-muted-foreground" /> : <FileText className="w-3 h-3 text-muted-foreground" />}
                          <span className="max-w-[150px] truncate">{s.title}</span>
                        </Badge>
                      </a>
                    );
                  })}
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    </motion.div>
  );
});

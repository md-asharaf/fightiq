"use client";

import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { User, Swords, ExternalLink, FileText } from "lucide-react";
import { ChatSource } from "@/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export interface MessageProps {
  role: "user" | "assistant";
  content: string;
  sources?: ChatSource[];
}

export function ChatMessage({ role, content, sources }: MessageProps) {
  const isUser = role === "user";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className={`w-full py-8 flex justify-center border-b border-border ${isUser ? 'bg-background' : 'bg-card'}`}
    >
      <div className="flex w-full max-w-3xl space-x-6 px-4">
        {/* Avatar */}
        <div className="shrink-0 flex flex-col items-center">
          <Avatar className="w-8 h-8 rounded-md shadow-sm">
            {isUser ? (
              <AvatarFallback className="bg-muted text-muted-foreground rounded-md">
                <User className="w-5 h-5" />
              </AvatarFallback>
            ) : (
              <AvatarFallback className="bg-primary text-primary-foreground rounded-md">
                <Swords className="w-5 h-5" />
              </AvatarFallback>
            )}
          </Avatar>
        </div>

        {/* Message Content */}
        <div className="flex-1 min-w-0 pt-1">
          <div className="prose prose-sm dark:prose-invert max-w-none prose-p:leading-7 prose-p:text-foreground prose-headings:text-foreground prose-a:text-primary hover:prose-a:text-primary/80 prose-strong:text-foreground prose-strong:font-bold">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
          </div>

          {/* Source Citations */}
          {!isUser && sources && sources.length > 0 && (
            <div className="mt-8 pt-6 border-t border-border">
              <p className="text-[11px] font-bold tracking-[0.2em] uppercase mb-4 text-muted-foreground">Sources</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {sources.map((s, idx) => {
                  const isLink = s.source && s.source.startsWith("http");
                  return (
                    <a
                      key={idx}
                      href={isLink ? s.source : undefined}
                      target={isLink ? "_blank" : undefined}
                      rel={isLink ? "noopener noreferrer" : undefined}
                      className={`flex items-center gap-3 p-3 rounded-md border border-border bg-background hover:bg-muted transition-all group ${!isLink && "cursor-default hover:bg-background"}`}
                    >
                      <div className="bg-card p-2 rounded shrink-0 text-muted-foreground group-hover:text-primary transition-colors">
                        {isLink ? <ExternalLink className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate transition-colors">{s.title}</p>
                        <p className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1 truncate">{s.category}</p>
                      </div>
                    </a>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

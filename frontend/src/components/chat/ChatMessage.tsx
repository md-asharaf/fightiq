"use client";

import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Badge } from "@/components/ui/badge";

interface Source {
  source_id: string;
  title: string;
}

export interface MessageProps {
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
}

export function ChatMessage({ role, content, sources }: MessageProps) {
  const isUser = role === "user";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`flex flex-col w-full ${isUser ? "items-end" : "items-start"} mb-4`}
    >
      <div
        className={`relative px-4 py-3 max-w-[85%] sm:max-w-[75%] rounded-2xl ${
          isUser
            ? "bg-red-600 text-white rounded-br-sm"
            : "bg-secondary text-secondary-foreground rounded-bl-sm"
        }`}
      >
        <div className={`prose prose-sm dark:prose-invert max-w-none ${isUser ? 'text-white' : ''}`}>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
        </div>

        {/* Source Citations */}
        {!isUser && sources && sources.length > 0 && (
          <div className="mt-3 pt-3 border-t border-border/50">
            <p className="text-xs font-semibold mb-2 text-muted-foreground">Sources:</p>
            <div className="flex flex-wrap gap-2">
              {sources.map((s, idx) => (
                <Badge key={idx} variant="outline" className="text-[10px] bg-background/50 cursor-default hover:bg-background/80 transition-colors">
                  {s.title}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

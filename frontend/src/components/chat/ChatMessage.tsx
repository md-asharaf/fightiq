"use client";

import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import React from "react";
import Image from "next/image";
import { ExternalLink, FileText, Check, Copy, Volume2, VolumeX } from "lucide-react";
import { ChatSource } from "@/types";
import { Avatar } from "@/components/ui/avatar";
import { useSession } from "@/lib/auth-client";
import { Badge } from "@/components/ui/badge";

export interface MessageProps {
  role: "user" | "assistant";
  content: string;
  sources?: ChatSource[];
}

const CodeBlock = ({ language, value }: { language: string, value: string }) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group my-4 rounded-md overflow-hidden border border-border/50 shadow-sm">
      <div className="flex items-center justify-between px-4 py-2 bg-muted/80 text-xs text-muted-foreground border-b border-border/50">
        <span className="lowercase font-medium">{language || "text"}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 hover:text-foreground transition-colors"
          title="Copy code"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
          <span>{copied ? "Copied!" : "Copy code"}</span>
        </button>
      </div>
      <div className="text-sm">
        <SyntaxHighlighter
          style={vscDarkPlus as Record<string, React.CSSProperties>}
          language={language}
          PreTag="div"
          customStyle={{ margin: 0, padding: '1rem', background: '#1e1e1e' }}
        >
          {value}
        </SyntaxHighlighter>
      </div>
    </div>
  );
};

export const ChatMessage = React.memo(function ChatMessage({ role, content, sources }: MessageProps) {
  const { data: session } = useSession();
  const isUser = role === "user";
  const userName = session?.user?.name || "User";


  const [isPlaying, setIsPlaying] = React.useState(false);
  const synthRef = React.useRef<SpeechSynthesis | null>(null);

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      synthRef.current = window.speechSynthesis;
    }
    return () => {
      if (synthRef.current) {
        synthRef.current.cancel();
      }
    };
  }, []);

  const toggleSpeech = () => {
    if (!synthRef.current) return;

    if (isPlaying) {
      synthRef.current.cancel();
      setIsPlaying(false);
    } else {
      // Strip markdown before reading aloud
      const cleanText = content.replace(/```[\s\S]*?```/g, "Code block omitted.") // Remove code blocks
        .replace(/[#*`>]/g, '') // Remove markdown symbols
        .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1'); // Replace links with just text
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.rate = 1.0;
      utterance.onend = () => setIsPlaying(false);
      utterance.onerror = () => setIsPlaying(false);

      // Stop any current speech before starting new one
      synthRef.current.cancel();
      synthRef.current.speak(utterance);
      setIsPlaying(true);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={`w-full flex ${isUser ? 'justify-end' : 'justify-start'} mb-6 px-4 md:px-0`}
    >
      <div className={`flex w-full max-w-3xl ${isUser ? 'justify-end' : 'justify-start space-x-4 md:space-x-6'}`}>
        {/* Assistant Avatar */}
        {!isUser && (
          <div className="shrink-0 flex flex-col items-center mt-1">
            <Avatar className="w-8 h-8 md:w-10 md:h-10 shadow-sm overflow-visible bg-transparent">
              <Image src="/favicon.ico" alt="FightIQ Logo" width={80} height={40} className="object-contain w-full h-full" />
            </Avatar>
          </div>
        )}

        {/* Message Content Bubble/Container */}
        <div
          className={`relative group ${isUser
              ? 'bg-muted text-foreground px-5 py-3.5 rounded-3xl rounded-tr-sm max-w-[85%]'
              : 'flex-1 min-w-0 pt-1'
            }`}
        >
          {!isUser && (
            <button
              onClick={toggleSpeech}
              className={`absolute -left-12 top-0 p-1.5 rounded-full transition-opacity ${isPlaying ? 'opacity-100 bg-primary/10 text-primary' : 'opacity-0 group-hover:opacity-100 text-muted-foreground hover:bg-muted hover:text-foreground'}`}
              title={isPlaying ? "Stop reading" : "Read aloud"}
            >
              {isPlaying ? <VolumeX className="h-4 w-4 md:h-5 md:w-5" /> : <Volume2 className="h-4 w-4 md:h-5 md:w-5" />}
            </button>
          )}

          <div className={`prose prose-sm md:prose-base dark:prose-invert max-w-none prose-p:leading-relaxed ${isUser ? 'prose-p:text-foreground' : 'prose-p:text-foreground'} prose-headings:text-foreground prose-a:text-primary hover:prose-a:text-primary/80 prose-strong:text-foreground prose-strong:font-bold`}>
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                code({ inline, className, children, ...props }: React.ComponentPropsWithoutRef<"code"> & { inline?: boolean }) {
                  const match = /language-(\w+)/.exec(className || "");
                  return !inline && match ? (
                    <CodeBlock
                      language={match[1]}
                      value={String(children).replace(/\n$/, "")}
                    />
                  ) : (
                    <code className={className} {...props}>
                      {children}
                    </code>
                  );
                },
              }}
            >
              {content}
            </ReactMarkdown>
          </div>

          {/* Source Citations */}
          {!isUser && sources && sources.length > 0 && (() => {
            const uniqueSources = Array.from(new Map(sources.map(s => [s.source || s.title, s])).values());
            return (
              <div className="mt-4 pt-3 border-t border-border/50">
                <div className="flex flex-wrap gap-2 items-center">
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
                        <Badge variant="outline" className="flex items-center gap-1.5 rounded-full bg-muted/30 hover:bg-muted/80 text-[11px] text-foreground/80 font-normal py-1 px-2 transition-colors border-border/60">
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

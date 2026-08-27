"use client";

import { useSharedChat } from "@/hooks/chat/useSharedChat";
import { useParams } from "next/navigation";
import { ChatMessage } from "@/components/chat/ChatMessage";
import Image from "next/image";
import Link from "next/link";
import { MessageSquarePlus } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function SharedChatPage() {
  const params = useParams();
  const { data: chatData, isLoading: loading, error } = useSharedChat(params.id);

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin opacity-80"></div>
          <p className="text-sm font-semibold text-muted-foreground animate-pulse">Loading shared chat...</p>
        </div>
      </div>
    );
  }

  if (error || !chatData) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-background p-4 text-center">
        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-6">
          <Image src="/favicon.ico" alt="FightIQ Logo" width={32} height={32} className="opacity-50 grayscale" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Chat Not Found</h1>
        <p className="text-muted-foreground mb-8 max-w-md">
          {error?.message || "This chat session doesn't exist or is no longer public."}
        </p>
        <Link href="/">
          <Button>Go to Homepage</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Top Banner */}
      <div className="w-full bg-card border-b border-border p-4 sticky top-0 z-10 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/">
            <Image src="/favicon.ico" alt="FightIQ Logo" width={32} height={32} />
          </Link>
          <div>
            <h1 className="font-bold text-sm leading-tight">Shared Chat Session</h1>
            <p className="text-xs text-muted-foreground">FightIQ RAG Assistant</p>
          </div>
        </div>
        <Link href="/chat">
          <Button size="sm" className="hidden sm:flex gap-2">
            <MessageSquarePlus className="h-4 w-4" />
            Start Your Own Chat
          </Button>
        </Link>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto pb-12 w-full max-w-3xl mx-auto pt-8">
        {chatData.messages.map((msg, idx) => (
          <ChatMessage key={idx} {...msg} />
        ))}
      </div>
      
      {/* Footer CTA (Mobile) */}
      <div className="sm:hidden p-4 border-t border-border bg-card text-center">
         <Link href="/chat">
          <Button className="w-full gap-2">
            <MessageSquarePlus className="h-4 w-4" />
            Start Your Own Chat
          </Button>
        </Link>
      </div>
    </div>
  );
}

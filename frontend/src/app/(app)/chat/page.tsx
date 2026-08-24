import { ChatView } from "@/components/chat/ChatView";
import { Suspense } from "react";

export const metadata = {
  title: "Chat | FightIQ",
  description: "Chat with the FightIQ AI assistant.",
};

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="flex h-full items-center justify-center"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>}>
      <ChatView />
    </Suspense>
  );
}

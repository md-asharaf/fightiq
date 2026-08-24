import { useQuery } from "@tanstack/react-query";
import { fetchApi } from "@/lib/api";
import { ChatSessionPreview } from "@/types";

export function useChatSessions(session: unknown, sessionLoading: boolean) {
  const { data: sessions = [], isLoading: loadingSessions } = useQuery<ChatSessionPreview[]>({
    queryKey: ["chat_sessions"],
    queryFn: async () => {
      try {
        return await fetchApi("/chat/sessions");
      } catch (e) {
        console.debug("Failed to fetch chat sessions:", e);
        return [];
      }
    },
    enabled: !!session && !sessionLoading,
  });

  return { sessions, loadingSessions };
}

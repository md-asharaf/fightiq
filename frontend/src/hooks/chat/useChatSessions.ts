import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchApi, deleteSession } from "@/lib/api";
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

  const queryClient = useQueryClient();

  const { mutate: deleteSessionMutate, isPending: isDeleting } = useMutation({
    mutationFn: deleteSession,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat_sessions"] });
    },
    onError: (error) => {
      console.error("Failed to delete session:", error);
    }
  });

  return { sessions, loadingSessions, deleteSessionMutate, isDeleting };
}

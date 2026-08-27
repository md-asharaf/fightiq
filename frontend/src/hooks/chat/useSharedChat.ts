import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { MessageProps } from "@/components/chat/ChatMessage";

export interface SharedChatData {
  session_id: string;
  messages: MessageProps[];
}

export function useSharedChat(shareId: string | string[] | undefined) {
  const id = Array.isArray(shareId) ? shareId[0] : shareId;

  return useQuery<SharedChatData, Error>({
    queryKey: ["sharedChat", id],
    queryFn: async () => {
      const res = await api.get(`/public/chat/${id}`);
      return res.data;
    },
    enabled: Boolean(id),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}

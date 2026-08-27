import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";

export function useShareChatAction() {
  return useMutation({
    mutationFn: async (sessionId: string) => {
      const res = await api.post(`/chat/history/${sessionId}/share`);
      return res.data.url;
    },
    onSuccess: async (url) => {
      const fullUrl = `${window.location.origin}${url}`;
      await navigator.clipboard.writeText(fullUrl);
      toast.success("Public link copied to clipboard!");
    },
    onError: () => {
      toast.error("Failed to share chat. Please ensure you are logged in.");
    }
  });
}

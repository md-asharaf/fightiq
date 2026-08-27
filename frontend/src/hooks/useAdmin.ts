import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchApi, uploadFile } from "@/lib/api";
import { Document } from "@/types";

import { useCallback } from "react";
import { useSession } from "@/lib/auth-client";

export function useAdmin(page: number = 1, pageSize: number = 10) {
  const queryClient = useQueryClient();
  const { data: session, isPending: sessionLoading } = useSession();

  const { data: documentsData, isLoading, isFetching, refetch: loadDocuments } = useQuery<{ items: Document[], total: number }>({
    queryKey: ["documents", page, pageSize],
    queryFn: async () => {
      return await fetchApi(`/documents?page=${page}&page_size=${pageSize}`);
    },
    enabled: !!session && session.user.role === "admin" && !sessionLoading,
  });

  const documents = documentsData?.items || [];
  const totalDocuments = documentsData?.total || 0;

  const { mutateAsync: triggerUfcStatsAsync, isPending: isTriggeringUfcStats } = useMutation({
    mutationFn: () => fetchApi("/admin/trigger/ufcstats", { method: "POST" }),
  });

  const { mutateAsync: triggerRankingsAsync, isPending: isTriggeringRankings } = useMutation({
    mutationFn: () => fetchApi("/admin/trigger/rankings", { method: "POST" }),
  });

  const { mutateAsync: uploadMutateAsync, isPending: isUploading } = useMutation({
    mutationFn: ({ file, category }: { file: File; category: string }) => uploadFile("/ingest/file", file, { category }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
    },
  });

  const { mutateAsync: deleteMutateAsync } = useMutation({
    mutationFn: (id: string) => fetchApi(`/documents/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
    },
  });

  const { mutateAsync: scrapeMutateAsync } = useMutation({
    mutationFn: ({ url, category }: { url: string; category: string }) => fetchApi("/ingest/scrape", {
      method: "POST",
      body: JSON.stringify({ url, category }),
    }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["documents"] }),
  });

  const triggerUfcStats = useCallback(() => triggerUfcStatsAsync(), [triggerUfcStatsAsync]);
  const triggerRankings = useCallback(() => triggerRankingsAsync(), [triggerRankingsAsync]);
  const uploadDoc = useCallback((file: File, category: string) => uploadMutateAsync({ file, category }), [uploadMutateAsync]);
  const deleteDoc = useCallback((id: string) => deleteMutateAsync(id), [deleteMutateAsync]);
  const scrapeUrl = useCallback((url: string, category: string) => scrapeMutateAsync({ url, category }), [scrapeMutateAsync]);

  return {
    documents,
    totalDocuments,
    isLoading,
    isFetching,
    triggeringUfcStats: isTriggeringUfcStats,
    triggeringRankings: isTriggeringRankings,
    uploading: isUploading,
    loadDocuments,
    triggerUfcStats,
    triggerRankings,
    uploadDoc,
    deleteDoc,
    scrapeUrl,
  };
}

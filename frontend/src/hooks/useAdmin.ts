import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchApi, uploadFile } from "@/lib/api";
import { Document } from "@/types";

export function useAdmin() {
  const queryClient = useQueryClient();

  const { data: documents = [], isLoading: loading, refetch: loadDocuments } = useQuery<Document[]>({
    queryKey: ["documents"],
    queryFn: () => fetchApi("/documents"),
  });

  const seedMutation = useMutation({
    mutationFn: () => fetchApi("/ingest/seed", { method: "POST" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["documents"] }),
  });

  const uploadMutation = useMutation({
    mutationFn: ({ file, category }: { file: File; category: string }) => uploadFile("/ingest/file", file, { category }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["documents"] }),
  });

  const scrapeMutation = useMutation({
    mutationFn: ({ url, category }: { url: string; category: string }) => fetchApi("/ingest/scrape", {
      method: "POST",
      body: JSON.stringify({ url, category }),
    }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["documents"] }),
  });

  return {
    documents,
    loading,
    seeding: seedMutation.isPending,
    loadDocuments,
    seedData: () => seedMutation.mutateAsync(),
    uploadDoc: (file: File, category: string) => uploadMutation.mutateAsync({ file, category }),
    scrapeUrl: (url: string, category: string) => scrapeMutation.mutateAsync({ url, category }),
  };
}

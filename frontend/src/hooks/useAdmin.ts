import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchApi, uploadFile } from "@/lib/api";
import { Document } from "@/types";

import { useCallback } from "react";

export function useAdmin(page: number = 1, pageSize: number = 10) {
  const queryClient = useQueryClient();

  const { data: documentsData, isLoading, isFetching, refetch: loadDocuments } = useQuery<{ items: Document[], total: number }>({
    queryKey: ["documents", page, pageSize],
    queryFn: async () => {
      return await fetchApi(`/documents?page=${page}&page_size=${pageSize}`);
    },
  });

  const documents = documentsData?.items || [];
  const totalDocuments = documentsData?.total || 0;

  const { mutateAsync: seedMutateAsync, isPending: isSeeding } = useMutation({
    mutationFn: () => fetchApi("/ingest/seed", { method: "POST" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["documents"] }),
  });

  const { mutateAsync: uploadMutateAsync, isPending: isUploading } = useMutation({
    mutationFn: ({ file, category }: { file: File; category: string }) => uploadFile("/ingest/file", file, { category }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
    },
  });

  const { mutateAsync: deleteMutateAsync } = useMutation({
    mutationFn: (id: string) => fetchApi(`/documents/${id}`, { method: "DELETE" }),
    onMutate: async (deletedId) => {
      await queryClient.cancelQueries({ queryKey: ["documents"] });
      const previousDocs = queryClient.getQueryData<Document[]>(["documents"]);
      queryClient.setQueryData<Document[]>(["documents"], (old) => 
        old ? old.filter((doc) => doc.id !== deletedId) : []
      );
      return { previousDocs };
    },
    onError: (err, deletedId, context) => {
      if (context?.previousDocs) {
        queryClient.setQueryData(["documents"], context.previousDocs);
      }
    },
    onSettled: () => {
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

  const seedData = useCallback(() => seedMutateAsync(), [seedMutateAsync]);
  const uploadDoc = useCallback((file: File, category: string) => uploadMutateAsync({ file, category }), [uploadMutateAsync]);
  const deleteDoc = useCallback((id: string) => deleteMutateAsync(id), [deleteMutateAsync]);
  const scrapeUrl = useCallback((url: string, category: string) => scrapeMutateAsync({ url, category }), [scrapeMutateAsync]);

  return {
    documents,
    totalDocuments,
    isLoading,
    isFetching,
    seeding: isSeeding,
    uploading: isUploading,
    loadDocuments,
    seedData,
    uploadDoc,
    deleteDoc,
    scrapeUrl,
  };
}

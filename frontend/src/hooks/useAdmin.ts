import { useState, useCallback } from "react";
import { fetchApi, uploadFile } from "@/lib/api";
import { Document } from "@/types";

export function useAdmin() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const loadDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchApi("/documents");
      setDocuments(data);
    } catch (error) {
      console.error("Failed to load documents", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const seedData = async (): Promise<void> => {
    setSeeding(true);
    try {
      await fetchApi("/ingest/seed", { method: "POST" });
      await loadDocuments();
    } finally {
      setSeeding(false);
    }
  };

  const uploadDoc = async (file: File, category: string): Promise<void> => {
    await uploadFile("/ingest/file", file, { category });
    await loadDocuments();
  };

  const scrapeUrl = async (url: string, category: string): Promise<void> => {
    await fetchApi("/ingest/scrape", {
      method: "POST",
      body: JSON.stringify({ url, category }),
    });
    await loadDocuments();
  };

  return {
    documents,
    loading,
    seeding,
    loadDocuments,
    seedData,
    uploadDoc,
    scrapeUrl,
  };
}

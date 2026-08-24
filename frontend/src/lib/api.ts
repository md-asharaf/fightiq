import { ChatSource } from "@/types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

export async function fetchApi(endpoint: string, options: RequestInit = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `API request failed with status ${response.status}`);
  }

  return response.json();
}

export async function uploadFile(endpoint: string, file: File, metadata: Record<string, string> = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const formData = new FormData();
  formData.append("file", file);
  if (metadata.category) {
    formData.append("category", metadata.category);
  }

  const response = await fetch(url, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `File upload failed with status ${response.status}`);
  }

  return response.json();
}


export interface StreamChatCallbacks {
  onChunk: (content: string) => void;
  onSources: (sources: ChatSource[]) => void;
  onError: (error: Error) => void;
  onComplete: () => void;
}

export async function streamChat(
  sessionId: string,
  message: string,
  callbacks: StreamChatCallbacks
) {
  const url = `${API_BASE_URL}/chat/message`;
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id: sessionId, message }),
    });

    if (!response.ok) {
      throw new Error("Failed to connect to chat API");
    }
    if (!response.body) {
      throw new Error("No response body");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let fullContent = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split("\n");

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const dataStr = line.replace("data: ", "").trim();
          if (dataStr === "[DONE]") {
            continue;
          }
          try {
            const data = JSON.parse(dataStr);
            if (data.type === "chunk") {
              fullContent += data.content;
              callbacks.onChunk(fullContent);
            } else if (data.type === "sources") {
              callbacks.onSources(data.sources);
            }
          } catch {
            // Ignore parse errors on partial chunks
          }
        }
      }
    }
    callbacks.onComplete();
  } catch (error) {
    callbacks.onError(error instanceof Error ? error : new Error(String(error)));
  }
}

export interface StreamScrapeCallbacks {
  onProgress: (status: string, data: unknown) => void;
  onError: (error: Error) => void;
  onComplete: () => void;
}

export async function streamScrape(
  topics: string[],
  category: string,
  callbacks: StreamScrapeCallbacks
) {
  const url = `${API_BASE_URL}/ingest/scrape`;
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topics, category }),
    });

    if (!response.ok) {
      throw new Error("Failed to connect to scrape API");
    }
    if (!response.body) {
      throw new Error("No response body");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split("\n");

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const dataStr = line.replace("data: ", "").trim();
          try {
            const data = JSON.parse(dataStr);
            callbacks.onProgress(data.status, data);
          } catch {
            // ignore
          }
        }
      }
    }
    callbacks.onComplete();
  } catch (error) {
    callbacks.onError(error instanceof Error ? error : new Error(String(error)));
  }
}

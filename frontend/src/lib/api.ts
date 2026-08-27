import { ChatSource } from "@/types";

const API_BASE_URL = "/api";
export async function fetchApi(endpoint: string, options: RequestInit = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    credentials: "include",
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMsg = errorData.detail || `API request failed with status ${response.status}`;
    throw new Error(errorMsg);
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
    credentials: "include",
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMsg = errorData.detail || `File upload failed with status ${response.status}`;
    throw new Error(errorMsg);
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
  callbacks: StreamChatCallbacks,
  signal?: AbortSignal
) {
  const url = `${API_BASE_URL}/chat/message`;
  try {
    const response = await fetch(url, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id: sessionId, message }),
      signal,
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
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const dataStr = line.substring(6).trim();
          if (dataStr === "[DONE]") {
            continue;
          }
          if (!dataStr) continue;

          try {
            const data = JSON.parse(dataStr);
            if (data.type === "chunk") {
              fullContent += data.content;
              callbacks.onChunk(fullContent);
            } else if (data.type === "sources") {
              callbacks.onSources(data.sources);
            }
          } catch (e) {
            console.error("Failed to parse chunk:", dataStr, e);
          }
        }
      }
    }
    callbacks.onComplete();
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.log('Stream aborted by user');
      callbacks.onComplete();
    } else {
      callbacks.onError(error instanceof Error ? error : new Error(String(error)));
    }
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
      credentials: "include",
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
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const dataStr = line.substring(6).trim();
          if (!dataStr) continue;
          try {
            const data = JSON.parse(dataStr);
            callbacks.onProgress(data.status, data);
          } catch (e) {
            console.error("Failed to parse scrape chunk:", dataStr, e);
          }
        }
      }
    }
    callbacks.onComplete();
  } catch (error) {
    callbacks.onError(error instanceof Error ? error : new Error(String(error)));
  }
}

export async function deleteSession(sessionId: string) {
  const url = `${API_BASE_URL}/chat/history/${sessionId}`;
  const response = await fetch(url, {
    method: "DELETE",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    let errorMsg = `Delete failed with status ${response.status}`;
    try {
      const errorData = await response.json();
      if (errorData.detail) errorMsg = errorData.detail;
    } catch (e) {
      console.debug("Failed to parse delete session error response", e);
    }
    throw new Error(errorMsg);
  }
}

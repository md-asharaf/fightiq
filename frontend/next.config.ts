import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  async rewrites() {
    if (process.env.NODE_ENV === "development") {
      return [
        {
          source: "/api/chat/:path*",
          destination: "http://localhost:8000/api/chat/:path*",
        },
        {
          source: "/api/ingest/:path*",
          destination: "http://localhost:8000/api/ingest/:path*",
        },
        {
          source: "/api/quiz/:path*",
          destination: "http://localhost:8000/api/quiz/:path*",
        },
        {
          source: "/api/eval/:path*",
          destination: "http://localhost:8000/api/eval/:path*",
        },
        {
          source: "/api/documents/:path*",
          destination: "http://localhost:8000/api/documents/:path*",
        }
      ];
    }
    return [];
  },
};

export default nextConfig;

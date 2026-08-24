import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";
    return [
      {
        source: "/api/chat/:path*",
        destination: `${backendUrl}/chat/:path*`,
      },
      {
        source: "/api/ingest/:path*",
        destination: `${backendUrl}/ingest/:path*`,
      },
      {
        source: "/api/quiz/:path*",
        destination: `${backendUrl}/quiz/:path*`,
      },
      {
        source: "/api/eval/:path*",
        destination: `${backendUrl}/eval/:path*`,
      },
      {
        source: "/api/documents/:path*",
        destination: `${backendUrl}/documents/:path*`,
      }
    ];
  },
};

export default nextConfig;

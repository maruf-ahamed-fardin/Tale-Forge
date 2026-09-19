import type { NextConfig } from "next";

const BACKEND_URL = process.env.INTERNAL_API_URL || "http://127.0.0.1:8000";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: "/api/v1/auth/:path*",
        destination: `${BACKEND_URL}/api/v1/auth/:path*`,
      },
      {
        source: "/api/v1/datasets/:path*",
        destination: `${BACKEND_URL}/api/v1/datasets/:path*`,
      },
      {
        source: "/api/v1/generate/:path*",
        destination: `${BACKEND_URL}/api/v1/generate/:path*`,
      },
      {
        source: "/api/v1/training/:path*",
        destination: `${BACKEND_URL}/api/v1/training/:path*`,
      },
    ];
  },
};

export default nextConfig;


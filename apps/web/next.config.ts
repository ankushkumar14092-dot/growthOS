import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // standalone is for Docker/Render; Vercel uses its own Next output
  ...(process.env.VERCEL ? {} : { output: "standalone" as const }),
  transpilePackages: ["@ai-growth-os/shared"],
  poweredByHeader: false,
  compress: true,
  experimental: {
    optimizePackageImports: ["@ai-growth-os/shared"],
  },
  async headers() {
    return [
      {
        source: "/_next/static/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/:path*\\.(ico|png|jpg|jpeg|svg|webp|woff2)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400, stale-while-revalidate=604800",
          },
        ],
      },
    ];
  },
};

export default nextConfig;

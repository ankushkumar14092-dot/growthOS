import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // standalone is for Docker/Render; Vercel uses its own Next output
  ...(process.env.VERCEL ? {} : { output: "standalone" as const }),
  transpilePackages: ["@ai-growth-os/shared"],
};

export default nextConfig;

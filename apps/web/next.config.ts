import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  transpilePackages: ["@ai-growth-os/shared"],
};

export default nextConfig;

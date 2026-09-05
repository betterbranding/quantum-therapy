import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: { remotePatterns: [{ protocol: "https", hostname: "**" }] },
  experimental: { optimizePackageImports: ["lucide-react", "motion"] },
};

export default nextConfig;

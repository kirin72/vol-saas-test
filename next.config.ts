import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    // TypeScript 에러는 엄격하게 검사
    ignoreBuildErrors: false,
  },
};

export default nextConfig;

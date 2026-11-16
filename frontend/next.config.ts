import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Self-contained server bundle for the Docker image (frontend/Dockerfile).
  // `next dev` is unaffected.
  output: "standalone",
};

export default nextConfig;

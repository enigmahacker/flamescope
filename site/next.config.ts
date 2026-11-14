// SI-generated code: written by Claude (Anthropic) via Claude Code under team direction. Project idea: human (team).
import type { NextConfig } from "next";

// Static export for GitHub Pages under /flamescope. cacheComponents needs a Node runtime, so it is off.
const nextConfig: NextConfig = {
  output: "export",
  basePath: process.env.NEXT_PUBLIC_BASE_PATH ?? "/flamescope",
  trailingSlash: true,
  images: { unoptimized: true },
  turbopack: {
    root: process.cwd(),  // a stray package-lock.json in $HOME otherwise confuses root detection
    rules: {
      "*.css": { loaders: ["@tailwindcss/turbopack"], as: "*.css" },
    },
  },
};

export default nextConfig;

import type { NextConfig } from "next";
import path from "node:path";

// EMIL Trade lives inside the EMIL repo next to a second package-lock.json.
// Pin the Turbopack root to THIS folder (dev and CI both run from it) so Next
// never infers the parent workspace as the root — that made dev resolve
// Tailwind from the parent's node_modules and crawl the whole parent tree.
const nextConfig: NextConfig = {
  turbopack: { root: path.resolve(process.cwd()) },
  outputFileTracingRoot: path.resolve(process.cwd()),
};

export default nextConfig;

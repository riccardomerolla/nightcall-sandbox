import type { NextConfig } from "next"

// Client-only app: static export, no server runtime. Deployed to GitHub
// Pages by .github/workflows/deploy.yml; NEXT_PUBLIC_BASE_PATH is set
// there to the repo subpath ("/nightcall-sandbox") and stays empty for
// local dev.
const nextConfig: NextConfig = {
  output: "export",
  basePath: process.env.NEXT_PUBLIC_BASE_PATH ?? "",
  images: { unoptimized: true }
}

export default nextConfig

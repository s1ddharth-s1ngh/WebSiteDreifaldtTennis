import type { NextConfig } from "next";

// GitHub Pages: Projektseite unter /<repo> (vom Workflow gesetzt), lokal leer
const basePath = process.env.PAGES_BASE_PATH ?? "";

const nextConfig: NextConfig = {
  // Statischer Export für GitHub Pages (kein Server): Ergebnis in out/
  output: "export",
  basePath,
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
  images: { unoptimized: true },
  // GitHub Pages: /seite/ -> seite/index.html (sonst kollidiert seite.html mit dem Ordner seite/)
  trailingSlash: true,
  agentRules: false,
};

export default nextConfig;

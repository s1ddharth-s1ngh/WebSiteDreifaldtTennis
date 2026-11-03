import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Statischer Export für GitHub Pages (kein Server): Ergebnis in out/
  output: "export",
  images: { unoptimized: true },
  // GitHub Pages: /seite/ -> seite/index.html (sonst kollidiert seite.html mit dem Ordner seite/)
  trailingSlash: true,
  agentRules: false,
  // Alte Wix-URLs (/über-uns, /miami-1): Weiterleitungsseiten in public/, da GitHub Pages keine 301 kann.
};

export default nextConfig;

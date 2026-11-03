import type { MetadataRoute } from "next";
import { pages, siteUrl } from "@/content/pages";

// Statischer Export: beim Build als Datei erzeugt
export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  return pages.map((p) => ({ url: siteUrl + (p.route === "/" ? "/" : p.route + "/") }));
}

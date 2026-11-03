// Prüft, dass jede Textzeile aus scrape/pages/<slug>/text.txt auf der neuen Seite vorkommt.
// Nutzung: Dev-Server starten, dann `node scripts/check-content.mjs [http://localhost:3000]`.
import { readFileSync } from "node:fs";

const base = process.argv[2] ?? "http://localhost:3000";
const routes = {
  home: "/",
  anmeldungen: "/anmeldungen",
  "tennisschule-kurse": "/tennisschule-kurse",
  tennisclubs: "/tennisclubs",
  "events-turniere": "/events-turniere",
  "kids-juniors": "/kids-juniors",
  seniors: "/seniors",
  "miami-1": "/miami",
  "ueber-uns": "/ueber-uns",
  "kontaktieren-sie-uns": "/kontaktieren-sie-uns",
};
const WIX_HEADER_LINES = 13; // Skip-Link, Logo-Texte und Wix-Menü

const entities = { amp: "&", quot: '"', apos: "'", lt: "<", gt: ">", nbsp: " " };
const decode = (s) =>
  s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&(\w+);/g, (m, n) => entities[n] ?? m);
// Vergleich ohne Leerraum und ohne Wix-Füllzeichen (Zero-Width-Space, BOM).
const norm = (s) => s.replace(/[\s​﻿]+/g, "");

let missingTotal = 0;
for (const [slug, route] of Object.entries(routes)) {
  const res = await fetch(base + route);
  if (!res.ok) throw new Error(`${route}: HTTP ${res.status}`);
  const html = await res.text();
  const pageText = norm(
    decode(html.replace(/<(script|style)[\s\S]*?<\/\1>/g, " ").replace(/<[^>]+>/g, " ")),
  );
  const lines = readFileSync(`scrape/pages/${slug}/text.txt`, "utf8").split("\n").slice(WIX_HEADER_LINES);
  const missing = lines.filter((l) => norm(l) && !pageText.includes(norm(l)));
  missingTotal += missing.length;
  console.log(`${missing.length ? "FEHLT" : "OK   "} ${route} (${lines.length} Zeilen)`);
  for (const l of missing) console.log(`        - ${l.trim()}`);
}
process.exit(missingTotal ? 1 : 0);

// GitHub Pages liefert die Seite unter /<repo>/ aus: absolute Pfade brauchen dieses Präfix (lokal leer).
const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export const url = <T extends string | undefined>(u: T) => (u?.startsWith("/") && !u.startsWith("//") ? base + u : u) as T;

// Für Links und Bilder innerhalb von HTML-Strings aus content/*.json
export const urls = (html: string) => html.replace(/(href|src)="\/(?!\/)/g, `$1="${base}/`);

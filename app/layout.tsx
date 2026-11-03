import type { Metadata, Viewport } from "next";
import { siteUrl } from "@/content/pages";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "Dreifaldt Tennis", template: "%s | Dreifaldt Tennis" },
};

// Desktop-Layout mit fester Breite (wie die Wix-Desktopseite)
export const viewport: Viewport = { width: 980 };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="de-CH">
      <body>{children}</body>
    </html>
  );
}

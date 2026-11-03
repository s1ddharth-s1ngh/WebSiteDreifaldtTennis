import type { Metadata, Viewport } from "next";
import { siteUrl } from "@/content/pages";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "Dreifaldt Tennis", template: "%s | Dreifaldt Tennis" },
};

// Desktop-Layout mit fester Breite wie bei Wix: ohne initial-scale, damit Tablets die 980px auf Bildschirmbreite verkleinern
export const viewport: Viewport = { width: 980, initialScale: undefined, userScalable: true };

// Wie Wix: Smartphones (nach User-Agent) bekommen das 320px-Layout, Tablets und Desktop das 980px-Layout.
// Läuft vor dem ersten Zeichnen; der Observer greift auch, wenn React das viewport-Meta beim Hydrieren neu einfügt.
const mobileSwitch = `var u=navigator.userAgent;if(/Mobi|iPhone|iPod|Windows Phone/i.test(u)&&!/iPad|Tablet/i.test(u)){document.documentElement.classList.add("m");var f=function(){document.querySelectorAll('meta[name="viewport"]').forEach(function(m){m.content="width=320, user-scalable=yes"})};f();new MutationObserver(f).observe(document.head,{childList:true})}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="de-CH" suppressHydrationWarning>
      <body>
        <script dangerouslySetInnerHTML={{ __html: mobileSwitch }} />
        {children}
      </body>
    </html>
  );
}

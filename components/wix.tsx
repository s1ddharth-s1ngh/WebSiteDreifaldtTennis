// Renders pages as positioned blocks on a 980px canvas (Wix desktop) and a 320px canvas (Wix smartphone).
import Image from "next/image";
import type { CSSProperties } from "react";
import header from "@/content/header.json";
import { url, urls } from "./base-path";
import { Slideshow, type Slide } from "./slideshow";
import { MobileMenu, QuickActions } from "./mobile";

type Rect = { x: number; y: number; w: number; h: number };
type Crop = { l: number; t: number; w: number; h: number };
export type Item =
  | (Rect & { t: "box"; s: CSSProperties; href?: string })
  | (Rect & { t: "html"; k: string; html: string; hover?: string })
  | (Rect & { t: "img"; src: string; alt: string; href?: string; fit?: "contain"; img?: Crop })
  | (Rect & { t: "slides"; images: Slide[]; arrow?: Rect & { html: string } })
  | (Rect & { t: "iframe"; src: string; title: string })
  | (Rect & { t: "form"; items: Item[] });

export type Page = {
  route: string;
  title: string;
  height: number;
  background: "tennis" | "miami";
  items: Item[];
  // Smartphone-Layout (Wix zeigt es auf Handys, Tablets bekommen das Desktop-Layout)
  mobile: { height: number; items: Item[] };
};

const pos = ({ x, y, w, h }: Rect, height = true): CSSProperties => ({
  position: "absolute",
  left: x,
  top: y,
  width: w,
  ...(height && { height: h }),
});

function Html({ html }: { html: string }) {
  return <div className="wx-fill" dangerouslySetInnerHTML={{ __html: urls(html) }} />;
}

// Bilder im ersten Bildschirm sofort laden (LCP)
const FOLD = 700;
const eager = (y: number) => (y < FOLD ? "eager" : undefined);

function Img({ it }: { it: Extract<Item, { t: "img" }> }) {
  const Tag = it.href ? "a" : "div";
  const loading = eager(it.y);
  const ext = it.href?.startsWith("/files/") ? { target: "_blank", rel: "noopener" } : {};
  return (
    <Tag href={url(it.href)} {...ext} style={{ ...pos(it), overflow: "hidden", display: "block" }}>
      {it.img ? (
        <Image
          src={url(it.src)}
          alt={it.alt}
          width={Math.round(it.img.w)}
          height={Math.round(it.img.h)}
          loading={loading}
          style={{ position: "absolute", left: it.img.l, top: it.img.t, width: it.img.w, height: it.img.h, maxWidth: "none" }}
        />
      ) : (
        <Image src={url(it.src)} alt={it.alt} fill sizes={`${Math.ceil(it.w)}px`} loading={loading} style={{ objectFit: "contain" }} />
      )}
    </Tag>
  );
}

export function Items({ items }: { items: Item[] }) {
  return items.map((it, i) => {
    switch (it.t) {
      case "box":
        return it.href ? (
          <a key={i} href={url(it.href)} style={{ ...pos(it), ...it.s }} />
        ) : (
          <div key={i} style={{ ...pos(it), ...it.s }} />
        );
      case "html":
        return it.hover ? (
          <div key={i} className="wx-hv" style={pos(it)}>
            <div className="wx-n wx-fill" dangerouslySetInnerHTML={{ __html: urls(it.html) }} />
            <div className="wx-h wx-fill" dangerouslySetInnerHTML={{ __html: urls(it.hover) }} />
          </div>
        ) : (
          <div key={i} style={pos(it, it.k !== "text")}>
            <Html html={it.html} />
          </div>
        );
      case "img":
        return <Img key={i} it={it} />;
      case "slides":
        return <Slideshow key={i} style={pos(it)} images={it.images} arrow={it.arrow} eager={!!eager(it.y)} />;
      case "iframe":
        return <iframe key={i} src={url(it.src)} title={it.title} style={{ ...pos(it), border: 0 }} allowFullScreen loading="lazy" />;
      case "form":
        return (
          <form key={i} action="mailto:tshd@bluewin.ch" method="post" encType="text/plain" style={pos(it)}>
            <Items items={it.items} />
          </form>
        );
    }
  });
}

type MenuEntry = { label: string; href: string; x: number; w: number };
// Wix-Untermenüs (erscheinen beim Hover)
const sub: Record<string, { label: string; href: string }> = {
  "/tennisschule-kurse": { label: "TENNISCLUBS", href: "/tennisclubs" },
  "/ueber-uns": { label: "KONTAKTIEREN SIE UNS", href: "/kontaktieren-sie-uns" },
};

function Menu({ route }: { route: string }) {
  const menu = header.menu as MenuEntry[];
  const bar = { x: menu[0].x, w: menu.reduce((s, m) => s + m.w, 0) };
  return (
    <nav aria-label="Website" className="wx-menu" style={{ left: bar.x, width: bar.w }}>
      <ul>
        {menu.map((m) => {
          const child = sub[m.href];
          const active = route === m.href || route === child?.href;
          return (
            <li key={m.href} style={{ width: m.w }} className={active ? "active" : undefined}>
              <a href={url(m.href)} aria-current={route === m.href ? "page" : undefined}>
                {m.label}
              </a>
              {child && (
                <ul className="wx-sub">
                  <li>
                    <a href={url(child.href)} aria-current={route === child.href ? "page" : undefined}>
                      {child.label}
                    </a>
                  </li>
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function Background({ kind }: { kind: Page["background"] }) {
  return (
    <div className="wx-bg" aria-hidden>
      {kind === "miami" ? (
        <video src={url("/videos/miami-meer.mp4")} poster={url("/images/miami-meer.jpg")} autoPlay muted loop playsInline />
      ) : (
        <Image src={url("/images/hero-tennisnetz-wappen.jpg")} alt="" fill priority sizes="100vw" style={{ objectFit: "cover" }} />
      )}
    </div>
  );
}

function ChatButton() {
  return (
    <a className="wx-chat" href="https://wa.me/41793222626" target="_blank" rel="noopener">
      <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden>
        <path d="M12 1.5C6 1.5 1.5 5.8 1.5 11c0 2.2.8 4.2 2.2 5.8L2.5 22l5.3-2c1.3.5 2.7.8 4.2.8 6 0 10.5-4.3 10.5-9.5S18 1.5 12 1.5z" fill="#fff" />
        <circle cx="7.5" cy="11" r="1.4" fill="#1d4379" />
        <circle cx="12" cy="11" r="1.4" fill="#1d4379" />
        <circle cx="16.5" cy="11" r="1.4" fill="#1d4379" />
      </svg>
      Wollen wir chatten?
    </a>
  );
}

const mobileMenu = (header.menu as MenuEntry[]).map(({ label, href }) => ({ label, href, sub: sub[href] }));

export function WixPage({ page }: { page: Page }) {
  return (
    <>
      <Background kind={page.background} />
      <div className="wx-page wx-d" style={{ height: page.height }}>
        <Items items={header.items as Item[]} />
        <Menu route={page.route} />
        <Items items={page.items} />
      </div>
      <div className="wx-page wx-m" style={{ height: page.mobile.height }}>
        <Items items={header.mobile as Item[]} />
        <MobileMenu route={page.route} entries={mobileMenu} />
        <Items items={page.mobile.items} />
      </div>
      <ChatButton />
      <QuickActions />
    </>
  );
}

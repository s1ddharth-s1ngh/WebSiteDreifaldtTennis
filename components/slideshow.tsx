"use client";
// Wix Pro-Gallery "Slideshow": wechselt alle 3 s, Pfeil = nächstes Bild.
import Image from "next/image";
import { useEffect, useState, type CSSProperties } from "react";

export type Slide = { src: string; alt: string; w: number; h: number; img: { l: number; t: number; w: number; h: number } };
type Arrow = { x: number; y: number; w: number; h: number; html: string };

const GAP = 4; // Wix imageMargin

export function Slideshow({ images, arrow, style, eager }: { images: Slide[]; arrow?: Arrow; style: CSSProperties; eager?: boolean }) {
  const [i, setI] = useState(0);
  const next = () => setI((n) => (n + 1) % images.length);
  useEffect(() => {
    const t = setInterval(() => setI((n) => (n + 1) % images.length), 3000);
    return () => clearInterval(t);
  }, [i, images.length]);

  return (
    <div style={{ ...style, overflow: "hidden" }}>
      <div style={{ display: "flex", gap: GAP, transform: `translateX(${-i * (images[0].w + GAP)}px)`, transition: "transform .6s ease" }}>
        {images.map((s, n) => (
          <div key={s.src} style={{ position: "relative", flex: "none", width: s.w, height: s.h, overflow: "hidden" }}>
            <Image
              src={s.src}
              alt={s.alt}
              width={Math.round(s.img.w)}
              height={Math.round(s.img.h)}
              loading={eager && n === 0 ? "eager" : undefined}
              style={{ position: "absolute", left: s.img.l, top: s.img.t, width: s.img.w, height: s.img.h, maxWidth: "none" }}
            />
          </div>
        ))}
      </div>
      {arrow && (
        <button
          type="button"
          aria-label="Nächstes Bild"
          onClick={next}
          style={{ position: "absolute", left: arrow.x, top: arrow.y, width: arrow.w, height: arrow.h, cursor: "pointer" }}
          dangerouslySetInnerHTML={{ __html: arrow.html }}
        />
      )}
    </div>
  );
}

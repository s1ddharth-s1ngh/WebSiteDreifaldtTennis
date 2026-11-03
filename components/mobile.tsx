"use client";
// Wix-Smartphone-Layout: Hamburger-Menü (Vollbild) und Schnellaktionen unten rechts.
import { useState } from "react";
import { url } from "./base-path";

type Entry = { label: string; href: string; sub?: { label: string; href: string } };

export function MobileMenu({ route, entries }: { route: string; entries: Entry[] }) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const link = (label: string, href: string) => (
    <a href={url(href)} aria-current={route === href ? "page" : undefined}>
      {label}
    </a>
  );
  return (
    <nav aria-label="Website" className={open ? "wx-tm open" : "wx-tm"}>
      <button type="button" aria-expanded={open} aria-label="Menü" onClick={() => setOpen(!open)}>
        <svg viewBox="0 0 20 17" width="20" height="17" aria-hidden>
          {open ? (
            <path d="M4 2.5l12 12M16 2.5l-12 12" />
          ) : (
            <path d="M0 .5h20M0 8.5h20M0 16.5h20" />
          )}
        </svg>
      </button>
      <div className="wx-tm-overlay" hidden={!open}>
        <ul>
          {entries.map((e) => (
            <li key={e.href}>
              {e.sub ? (
                <>
                  <div className="wx-tm-row">
                    <button
                      type="button"
                      aria-expanded={expanded === e.href}
                      aria-label={`Untermenü ${e.label}`}
                      onClick={() => setExpanded(expanded === e.href ? null : e.href)}
                    >
                      {expanded === e.href ? "-" : "+"}
                    </button>
                    {link(e.label, e.href)}
                  </div>
                  {expanded === e.href && <div className="wx-tm-sub">{link(e.sub.label, e.sub.href)}</div>}
                </>
              ) : (
                link(e.label, e.href)
              )}
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}

const actions = [
  { label: "Telefon", href: "tel:+41793222626", bg: "rgb(99, 201, 86)", viewBox: "17.052 7.009 15.938 16.944",
    d: "M21.886 7.46c-.265-.483-.827-.599-1.271-.247l-1.74 1.38c-2.164 1.718-2.44 4.79-.618 6.86l5.96 6.772c1.822 2.07 5.011 2.316 7.13.542l1.313-1.1c.428-.357.444-.946.028-1.322l-2.904-2.63c-.412-.373-1.105-.404-1.54-.076l-1.714 1.296-4.843-5.353 1.743-1.259c.446-.321.595-.97.327-1.457l-1.87-3.406z" },
  { label: "E-Mail", href: "mailto:tshd@bluewin.ch", bg: "rgb(190, 24, 103)", viewBox: "15 8 20 15",
    d: "M15 9.992C15 8.892 15.898 8 16.99 8h16.02C34.108 8 35 8.893 35 9.992v11.016c0 1.1-.898 1.992-1.99 1.992H16.99A1.992 1.992 0 0 1 15 21.008V9.992zm3.1.867a1.004 1.004 0 0 0 .236 1.396l4.56 3.257c1.185.847 3.02.848 4.208 0l4.56-3.257c.45-.322.554-.95.235-1.396l.202.282a1.004 1.004 0 0 0-1.398-.23l-4.56 3.257c-.612.437-1.675.437-2.286 0l-4.56-3.257a1.004 1.004 0 0 0-1.398.23l.202-.282z" },
  { label: "Chat (WhatsApp)", href: "https://wa.me/41793222626", bg: "rgb(45, 65, 169)", viewBox: "17 8 17 17.989",
    d: "M19 8c-1.105 0-2 .892-2 2.005v9.577a2 2 0 0 0 1.99 2.004h2.238l-.18 3.847c-.027.555.3.724.736.371L27 21.586h4.994A2.001 2.001 0 0 0 34 19.582v-9.577C34 8.897 33.11 8 32 8H19z" },
];

export function QuickActions() {
  const [open, setOpen] = useState(false);
  return (
    <div className={open ? "wx-qa open" : "wx-qa"}>
      {open && <div className="wx-qa-backdrop" onClick={() => setOpen(false)} />}
      {open && (
        <ul>
          {actions.map((a) => (
            <li key={a.label}>
              <a href={a.href} aria-label={a.label} style={{ background: a.bg }} {...(a.href.startsWith("http") && { target: "_blank", rel: "noopener" })}>
                <svg viewBox={a.viewBox} aria-hidden>
                  <path d={a.d} fillRule="evenodd" />
                </svg>
              </a>
            </li>
          ))}
        </ul>
      )}
      <button type="button" aria-label="Schnellaktionen" aria-expanded={open} onClick={() => setOpen(!open)}>
        <i />
        <i />
        <i />
      </button>
    </div>
  );
}

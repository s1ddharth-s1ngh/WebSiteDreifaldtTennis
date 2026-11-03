# Migrazione Dreifaldt Tennis: da Wix a Next.js

## Obiettivo
Portare il sito https://www.dreifaldt-tennis.com (oggi su Wix) in un progetto Next.js gestito internamente.

- **Fase 1 (ora):** copia **identica** del sito Wix (layout desktop, font, colori, posizioni, hover) in Next.js. Nessuna modifica grafica finché il proprietario non lo chiede.
- **Fase 2 (dopo):** modifiche indicate dal proprietario, decisioni su hosting, form e CMS.

## Come è fatta la copia
- Ogni pagina è un file `content/pages/<slug>.json`: elenco di blocchi con posizione assoluta su una tela di 980 px (come Wix desktop). Tipi: `box` (sfondi, linee, bordi), `html` (testi e pulsanti con stili inline misurati dal sito live; `hover` = stato al passaggio del mouse), `img` (con ritaglio calcolato), `slides` (galleria), `iframe`, `form`.
- `content/header.json`: header comune (logo e voci di menu). Il menu con i sottomenu (Tennisclubs, Kontaktieren Sie uns) è in `components/wix.tsx`.
- Rendering: `components/wix.tsx`, route unica `app/[[...slug]]/page.tsx`.
- Font: in `public/fonts` con gli stessi nomi di famiglia usati da Wix. Avenir, Futura e Helvetica sono font Monotype con licenza Wix: sostituiti da font di sistema.
- Differenze note: la mappa Google è un embed standard (non il widget Wix); la chat Wix è sostituita da un pulsante identico che apre WhatsApp; il form invia via `mailto:`; su smartphone si vede la versione desktop rimpicciolita (Wix ha un layout mobile separato, non ancora copiato).

## Stato attuale
- Lo scraping è completo ed è in `scrape/` (circa 40 MB, **non versionato**).
- Lo script è `scripts/scrape-wix.cjs`. Si rilancia con `npm i -D playwright`, poi `node scripts/scrape-wix.cjs scrape`. Su Windows senza Chromium installato aggiungere `PW_CHANNEL=msedge`. Impiega circa 30 secondi.
- Hosting: GitHub Pages (export statico `out/`, deploy automatico a ogni push su `main` con `.github/workflows/deploy.yml`). I vecchi URL Wix `/über-uns` e `/miami-1` sono pagine di reindirizzamento in `public/` (GitHub Pages non supporta i 301).

## Struttura di `scrape/`
| Percorso | Contenuto |
|---|---|
| `pages/<slug>/content.json` | Fonte principale: `blocks` (h1–h6, p, li, link, bottoni in ordine), `images` (con `local` → file scaricato), `links`, `media` (iframe/video), `meta` |
| `pages/<slug>/content.md` | Gli stessi testi in forma leggibile (le voci del menu compaiono due volte, come `li` e come link: ignorare il duplicato) |
| `pages/<slug>/text.txt` | Testo semplice della pagina in ordine visivo, utile per controllare che nulla manchi |
| `pages/<slug>/screenshot.png` | Screenshot desktop della pagina intera: riferimento per struttura e gerarchia |
| `pages/<slug>/index.html` | HTML renderizzato (da usare solo se serve un dettaglio mancante altrove) |
| `assets/images/` | 29 immagini in risoluzione originale |
| `assets/files/` | 17 PDF (nomi Wix tipo `f4d24a_...pdf`) |
| `images.json` / `files.json` | Indice: file locale, alt o etichetta del link, pagine in cui compare |
| `site.json` | Menu di navigazione |
| `pages.json` | Elenco delle pagine |

## Pagine (lingua: tedesco svizzero)
| Slug Wix | URL attuale | Note |
|---|---|---|
| home | `/` | Benvenuto, news ("Laufende und Kommende Events"), indirizzi, link al Jahreskalender (PDF) |
| anmeldungen | `/anmeldungen` | Tanti moduli PDF di iscrizione |
| tennisschule-kurse | `/tennisschule-kurse` | Corsi, costi |
| tennisclubs | `/tennisclubs` | Club (TC Leimental) |
| events-turniere | `/events-turniere` | Eventi e tornei |
| kids-juniors | `/kids-juniors` | Bambini e juniores, camp |
| seniors | `/seniors` | Contiene un video YouTube `R57MExgLIBg` |
| miami-1 | `/miami-1` | Contiene un video MP4 Wix **non scaricato**: `https://video.wixstatic.com/video/11062b_95d34f15761e4114a57b17823228948e/1080p/mp4/file.mp4` |
| ueber-uns | `/über-uns` | Chi siamo, trainer |
| kontaktieren-sie-uns | `/kontaktieren-sie-uns` | Contatti, mappa, form (Name/Vorname, Email, Telefonnummer, Nachricht) |

Ordine del menu: HOME, ANMELDUNGEN, TENNISSCHULE/-KURSE, TENNISCLUBS, EVENTS & TURNIERE, KIDS/JUNIORS, SENIORS, MIAMI, ÜBER UNS, KONTAKTIEREN SIE UNS.

### Dati di contatto (da `kontaktieren-sie-uns`)
- Hansi Dreifaldt, Tennisschulleiter und Trainer: Hüsliackerweg 10, CH-4105 Biel-Benken, Tel. +41 79 322 2626, tshd@bluewin.ch
- Administration: Francesca Cerisola, Tel. +41 79 291 9148
- Sede corsi: TC Leimental, Birsmattstrasse 60, Therwil
- Si usa molto WhatsApp (079 322 2626)

## Decisioni di default per la Fase 1 (modificabili)
- **Stack:** Next.js (App Router) + TypeScript, CSS semplice. Nessuna libreria UI.
- **Contenuti:** file JSON nel repository (`content/pages/*.json`), niente CMS per ora. Testi e stili misurati dal sito live.
- **Asset:** immagini in `public/images/` e PDF in `public/files/`, con nomi leggibili (per esempio `jahreskalender-2026.pdf`) basati sulle etichette di `files.json`. Le immagini si servono con `next/image`.
- **URL:** mantenere gli stessi percorsi per la SEO. Per `über-uns` e `miami-1` si può usare uno slug pulito (`/ueber-uns`, `/miami`) con **redirect 301** dai vecchi URL in `next.config`.
- **SEO:** `metadata` per ogni pagina e `lang="de-CH"`. I title Wix attuali ("… | Actual Model") sono sbagliati: usare "<Pagina> | Dreifaldt Tennis". Aggiungere `sitemap.ts` e `robots.ts`.
- **Widget e embed:**
  - La chat Wix (`engage.wixapps.net`) si toglie e al suo posto va un link WhatsApp.
  - La mappa Google diventa un embed standard o un link.
  - Il video YouTube va con `youtube-nocookie`.
- **Form contatti:** per ora va un `mailto:`/WhatsApp come fallback. L'invio vero (per esempio Resend tramite route handler) è da decidere in Fase 2.
- **Responsive e accessibilità:** mobile-first, contrasto adeguato, alt delle immagini, navigazione da tastiera e menu mobile.
- **Build:** il sito deve poter essere tutto statico (SSG). L'hosting è ancora da decidere (Vercel o export statico).

## Regole del repository
- Usare l'identità git del repository, Conventional Commits, nessuna attribuzione o firma nei commit e nei file.
- `scrape/` resta fuori dal repository: aggiungerla a `.gitignore` quando si crea il progetto.

## Domande aperte (Fase 2)
- Hosting e dominio (oggi il DNS punta a Wix)
- Invio del form contatti
- Il cliente deve poter modificare news ed eventi da solo? Se sì, serve un CMS headless o un file semplice
- Palette e logo: il sito attuale non ha una brand identity chiara

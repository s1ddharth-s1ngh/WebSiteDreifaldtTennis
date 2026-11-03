// Full scrape of the Wix site: rendered HTML, screenshots, structured content, original images and files.
// Usage: node scripts/scrape-wix.cjs [outDir]   (requires `playwright` resolvable via NODE_PATH or local install)
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const ORIGIN = 'https://www.dreifaldt-tennis.com';
const OUT = path.resolve(process.argv[2] || 'scrape');
const MAX_PAGES = 200;

const slugOf = (u) => {
  const p = decodeURIComponent(new URL(u).pathname).replace(/^\/|\/$/g, '');
  if (!p) return 'home';
  return p.replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/[^a-zA-Z0-9-_]+/g, '_');
};
// Wix media URLs carry transforms after /v1/; the part before is the original upload.
const originalMedia = (u) => u.replace(/^(https:\/\/static\.wixstatic\.com\/media\/[^/]+)\/v1\/.*$/, '$1');
const isInternal = (u) => { try { return new URL(u).host === new URL(ORIGIN).host; } catch { return false; } };
const normalize = (u) => { const x = new URL(u); x.hash = ''; x.search = ''; return x.href.replace(/\/$/, ''); };
const isFile = (u) => /static\.wixstatic\.com\/(ugd|media)\/|usrfiles\.com|\.(pdf|docx?|xlsx?|zip)(\?|$)/i.test(u);

async function sitemapUrls() {
  const get = async (u) => (await fetch(u)).text();
  const locs = (xml) => [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  const urls = [];
  for (const sm of locs(await get(`${ORIGIN}/sitemap.xml`))) {
    urls.push(...(sm.endsWith('.xml') ? locs(await get(sm)) : [sm]));
  }
  return urls;
}

async function download(url, dest) {
  if (fs.existsSync(dest)) return true;
  const res = await fetch(url);
  if (!res.ok) { console.warn(`  ! ${res.status} ${url}`); return false; }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
  return true;
}

async function autoScroll(page) {
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 400) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 150));
    }
    window.scrollTo(0, 0);
  });
}

// Runs in the browser: content in document order.
function extract() {
  const visible = (el) => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none'; };
  const clean = (t) => (t || '').replace(/ /g, ' ').replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n').trim();
  const blocks = [];
  const seen = new Set();
  for (const el of document.querySelectorAll('h1,h2,h3,h4,h5,h6,p,li,a[data-testid="linkElement"],button')) {
    if (!visible(el) || el.closest('header,footer') && el.tagName === 'BUTTON') continue;
    if (el.tagName === 'P' && el.closest('li')) continue;
    const text = clean(el.innerText);
    if (!text) continue;
    const key = el.tagName + text;
    if (seen.has(key)) continue;
    seen.add(key);
    const b = { tag: el.tagName.toLowerCase(), text };
    if (el.tagName === 'A') b.href = el.href;
    blocks.push(b);
  }
  const images = [...document.querySelectorAll('img')].map((i) => ({
    src: i.currentSrc || i.src, alt: i.alt || '', width: i.naturalWidth, height: i.naturalHeight,
  })).filter((i) => i.src && !i.src.startsWith('data:'));
  for (const el of document.querySelectorAll('[style*="background-image"]')) {
    const m = el.style.backgroundImage.match(/url\(["']?([^"')]+)/);
    if (m) images.push({ src: m[1], alt: '', background: true });
  }
  const links = [...document.querySelectorAll('a[href]')].map((a) => ({ text: clean(a.innerText), href: a.href }));
  const media = [...document.querySelectorAll('iframe,video,video source')].map((e) => ({ tag: e.tagName.toLowerCase(), src: e.src }))
    .filter((m) => m.src);
  const meta = {};
  for (const m of document.querySelectorAll('meta[name],meta[property]')) meta[m.getAttribute('name') || m.getAttribute('property')] = m.content;
  const nav = [...document.querySelectorAll('nav a, header a')].map((a) => ({ text: clean(a.innerText), href: a.href })).filter((l) => l.text);
  const footer = clean(document.querySelector('footer')?.innerText);
  return { title: document.title, lang: document.documentElement.lang, meta, blocks, images, links, media, nav, footer,
    text: clean(document.body.innerText) };
}

const toMarkdown = (c, url) => [
  `# ${c.title}`, '', `Fonte: ${url}`, '',
  ...c.blocks.map((b) => {
    if (/^h[1-6]$/.test(b.tag)) return `${'#'.repeat(Math.min(+b.tag[1] + 1, 6))} ${b.text}\n`;
    if (b.tag === 'li') return `- ${b.text}`;
    if (b.tag === 'a') return `[${b.text}](${b.href})\n`;
    if (b.tag === 'button') return `[Button: ${b.text}]\n`;
    return `${b.text}\n`;
  }),
  '', '## Immagini', '', ...c.images.map((i) => `- ![${i.alt}](${i.local || i.src})`),
  ...(c.media.length ? ['', '## Embed / Video', '', ...c.media.map((m) => `- ${m.tag}: ${m.src}`)] : []),
].join('\n');

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch(process.env.PW_CHANNEL ? { channel: process.env.PW_CHANNEL } : {});
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'de-DE' });
  const page = await ctx.newPage();

  const queue = (await sitemapUrls()).map(normalize);
  const done = new Set();
  const imageIndex = {}; // original url -> { local, alt, pages }
  const fileIndex = {};
  const pages = [];

  while (queue.length && done.size < MAX_PAGES) {
    const url = queue.shift();
    if (done.has(url)) continue;
    done.add(url);
    const slug = slugOf(url);
    const dir = path.join(OUT, 'pages', slug);
    console.log(`> ${url}  ->  pages/${slug}`);
    try {
      // Wix never reaches networkidle (analytics polling); 'load' + autoScroll is enough.
      await page.goto(url, { waitUntil: 'load', timeout: 60000 });
    } catch (e) { console.warn(`  ! ${e.message.split('\n')[0]}`); }
    await autoScroll(page);
    await page.waitForTimeout(1500);
    fs.mkdirSync(dir, { recursive: true });

    const c = await page.evaluate(extract);
    for (const img of c.images) {
      const orig = originalMedia(img.src);
      img.original = orig;
      if (!/static\.wixstatic\.com\/media\//.test(orig)) continue;
      const name = decodeURIComponent(orig.split('/media/')[1]).replace(/~/g, '_').replace(/[\/\\:*?"<>|]/g, '_');
      const entry = imageIndex[orig] ||= { local: `assets/images/${name}`, alt: img.alt, pages: [] };
      if (!entry.pages.includes(slug)) entry.pages.push(slug);
      if (!entry.alt && img.alt) entry.alt = img.alt;
      img.local = `../../${entry.local}`;
    }
    for (const l of c.links) {
      if (isFile(l.href)) {
        const name = decodeURIComponent(new URL(l.href).pathname.split('/').pop());
        (fileIndex[l.href] ||= { local: `assets/files/${name}`, text: l.text, pages: [] }).pages.push(slug);
      } else if (isInternal(l.href)) {
        const n = normalize(l.href);
        if (!done.has(n) && !queue.includes(n)) queue.push(n);
      }
    }

    fs.writeFileSync(path.join(dir, 'index.html'), await page.content());
    fs.writeFileSync(path.join(dir, 'content.json'), JSON.stringify({ url, ...c }, null, 2));
    fs.writeFileSync(path.join(dir, 'content.md'), toMarkdown(c, url));
    fs.writeFileSync(path.join(dir, 'text.txt'), c.text);
    await page.screenshot({ path: path.join(dir, 'screenshot.png'), fullPage: true }).catch((e) => console.warn(`  ! screenshot ${e.message}`));
    pages.push({ url, slug, title: c.title, description: c.meta.description || c.meta['og:description'] || '' });
    if (pages.length === 1) fs.writeFileSync(path.join(OUT, 'site.json'), JSON.stringify({ origin: ORIGIN, nav: c.nav, footer: c.footer }, null, 2));
  }
  await browser.close();

  console.log(`Downloading ${Object.keys(imageIndex).length} images, ${Object.keys(fileIndex).length} files...`);
  for (const [u, e] of [...Object.entries(imageIndex), ...Object.entries(fileIndex)]) {
    try { e.ok = await download(u, path.join(OUT, e.local)); } catch (err) { console.warn(`  ! ${u} ${err.message}`); e.ok = false; }
  }
  fs.writeFileSync(path.join(OUT, 'pages.json'), JSON.stringify(pages, null, 2));
  fs.writeFileSync(path.join(OUT, 'images.json'), JSON.stringify(imageIndex, null, 2));
  fs.writeFileSync(path.join(OUT, 'files.json'), JSON.stringify(fileIndex, null, 2));
  console.log(`Done: ${pages.length} pages -> ${OUT}`);
})();

// Liest das Smartphone-Layout der Wix-Seite (320px-Leinwand) und schreibt es als `mobile` in content/pages/*.json
// und content/header.json. Bilder und PDFs werden per Inhalt (Hash) den Dateien in public/ zugeordnet.
// Nutzung: `npm i -D playwright`, dann `node scripts/scrape-wix-mobile.cjs` (benötigt scrape/ vom Desktop-Scrape).
// Ohne installiertes Chromium: PW_CHANNEL=msedge.
const { chromium, devices } = require('playwright');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ORIGIN = 'https://www.dreifaldt-tennis.com';
const PAGES = {
  home: '/', anmeldungen: '/anmeldungen', 'tennisschule-kurse': '/tennisschule-kurse', tennisclubs: '/tennisclubs',
  'events-turniere': '/events-turniere', 'kids-juniors': '/kids-juniors', seniors: '/seniors', miami: '/miami-1',
  'ueber-uns': '/über-uns', 'kontaktieren-sie-uns': '/kontaktieren-sie-uns',
};
const ROUTES = { '': '/', 'miami-1': '/miami', 'über-uns': '/ueber-uns' };

// --- Zuordnung Wix-Datei -> lokale Datei (über den Inhalt) ---
const md5 = (f) => crypto.createHash('md5').update(fs.readFileSync(f)).digest('hex');
const byHash = (dir) => Object.fromEntries(fs.readdirSync(dir).map((f) => [md5(path.join(dir, f)), f]));
const pubImages = byHash('public/images');
const pubFiles = byHash('public/files');
const mediaMap = {}; // wix media id -> /images/<name>
for (const [orig, e] of Object.entries(require(path.resolve('scrape/images.json')))) {
  const f = path.join('scrape', e.local);
  if (fs.existsSync(f) && pubImages[md5(f)]) mediaMap[orig.split('/media/')[1]] = `/images/${pubImages[md5(f)]}`;
}
const fileMap = {}; // pdf name -> /files/<name>
for (const e of Object.values(require(path.resolve('scrape/files.json')))) {
  const f = path.join('scrape', e.local);
  if (fs.existsSync(f) && pubFiles[md5(f)]) fileMap[path.basename(e.local)] = `/files/${pubFiles[md5(f)]}`;
}
const missing = new Set();
const mapUrl = (u) => {
  if (!u) return u;
  const file = u.match(/\/(?:_files\/)?ugd\/([^/?#]+\.pdf)/i);
  if (file) return fileMap[file[1]] ?? (missing.add(u), u);
  const media = u.match(/static\.wixstatic\.com\/media\/([^/?#]+)/);
  const local = media && `/images/${media[1].replace(/~/g, '_')}`;
  if (media) return mediaMap[media[1]] ?? (fs.existsSync('public' + local) ? local : (missing.add(u), u));
  if (u.startsWith(ORIGIN)) {
    const p = decodeURIComponent(new URL(u).pathname).replace(/^\/|\/$/g, '');
    return ROUTES[p] ?? '/' + p;
  }
  return u;
};
const mapHtml = (h) => h
  .replace(/(href|src)="([^"]+)"/g, (_, a, u) => `${a}="${mapUrl(u.replace(/&amp;/g, '&'))}"`)
  .replace(/url\(&quot;([^&]+)&quot;\)/g, (_, u) => `url(&quot;${mapUrl(u)}&quot;)`);

// --- Läuft im Browser: Elemente der Wix-Seite als positionierte Blöcke ---
async function extract(rootIds) {
  const TEXT = ['font-family', 'font-size', 'font-weight', 'font-style', 'line-height', 'letter-spacing', 'color', 'text-align',
    'text-transform', 'text-shadow', 'white-space', 'word-spacing', 'direction', 'text-indent', 'list-style-type', 'list-style-position'];
  const BOX = ['background-color', 'background-image', 'background-size', 'background-position', 'background-repeat',
    'border-top', 'border-right', 'border-bottom', 'border-left', 'border-radius', 'box-shadow', 'opacity',
    'margin-top', 'margin-right', 'margin-bottom', 'margin-left', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
    'display', 'flex-direction', 'align-items', 'justify-content', 'gap', 'text-decoration-line', 'text-decoration-color', 'vertical-align'];
  const frame = document.createElement('iframe');
  frame.style.display = 'none';
  document.body.append(frame);
  const blank = (tag, prop) => {
    const el = frame.contentDocument.createElement(tag);
    frame.contentDocument.body.append(el);
    const v = frame.contentWindow.getComputedStyle(el).getPropertyValue(prop);
    el.remove();
    return v;
  };
  // Nach dem Reset in globals.css sind Abstände 0, Hintergrund leer, keine Linien/Unterstreichung
  const RESET = { 'background-color': 'rgba(0, 0, 0, 0)', 'background-image': 'none', 'box-shadow': 'none', opacity: '1',
    'text-decoration-line': 'none', 'border-radius': '0px', 'vertical-align': 'baseline' };
  const isDefault = (el, p, v) => {
    if (p === 'background-color') return /, 0\)$/.test(v);
    if (p in RESET) return v === RESET[p];
    if (/^(margin|padding)/.test(p)) return v === '0px';
    if (/^border-(top|right|bottom|left)$/.test(p)) return /^0px/.test(v) || / none /.test(v);
    if (p === 'text-decoration-color') return true; // nur zusammen mit -line relevant
    if (/^background-(size|position|repeat)$/.test(p)) return true; // nur mit background-image (siehe ser)
    if (p === 'flex-direction') return v === 'row';
    if (/^(align-items|justify-content|gap)$/.test(p)) return v === 'normal';
    return v === blank(el.tagName, p);
  };
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/ /g, '&nbsp;');
  const attr = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
  const vis = (el) => {
    const s = getComputedStyle(el);
    return s.display !== 'none' && s.visibility !== 'hidden' && +s.opacity > 0;
  };
  const rectOf = (el) => {
    const r = el.getBoundingClientRect();
    return { x: +r.x.toFixed(1), y: +(r.y + scrollY).toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1) };
  };

  // Element + Kinder mit berechneten Stilen (nur Abweichungen vom Elternelement bzw. Reset)
  function ser(el, parent, root, btn = false) {
    if (el.nodeType === 3) return esc(el.textContent);
    if (el.nodeType !== 1 || !vis(el)) return '';
    const tag = el.tagName.toLowerCase();
    const s = getComputedStyle(el);
    if (tag === 'svg') {
      const c = el.cloneNode(true);
      c.removeAttribute('class');
      c.setAttribute('style', `width:${s.width};height:${s.height};fill:${s.fill};display:${s.display};flex:none`);
      for (const n of c.querySelectorAll('*')) n.removeAttribute('class');
      return c.outerHTML;
    }
    const ps = parent && getComputedStyle(parent);
    const st = [];
    // Listen: der Reset setzt list-style auf none, daher immer übernehmen
    const list = /^(ul|ol|li)$/.test(tag);
    for (const p of TEXT) {
      const v = s.getPropertyValue(p);
      if (root || v !== ps.getPropertyValue(p) || (list && p.startsWith('list-style'))) st.push(`${p}:${v}`);
    }
    for (const p of BOX) {
      if (root && p.startsWith('margin')) continue; // Position kommt aus dem Rechteck
      const v = s.getPropertyValue(p);
      if (!isDefault(el, p, v) || (p.startsWith('background-') && s.backgroundImage !== 'none')) st.push(`${p}:${v}`);
    }
    if (root) st.push('box-sizing:border-box', 'width:100%');
    // Buttons: Container, die bei Wix die volle Höhe haben (Label vertikal zentriert)
    if (btn && !root && parent && Math.abs(el.getBoundingClientRect().height - parent.clientHeight) < 1 && parent.clientHeight > 0) st.push('height:100%');
    let a = '';
    if (tag === 'a' && el.getAttribute('href')) a += ` href="${attr(el.href)}"${el.target === '_blank' ? ' target="_blank"' : ''}`;
    if (el.getAttribute('aria-label')) a += ` aria-label="${attr(el.getAttribute('aria-label'))}"`;
    const inner = [...el.childNodes].map((c) => ser(c, el, false, btn)).join('');
    if (tag === 'br') return '<br>';
    if (tag === 'span' && !st.length && !a) return inner;
    return `<${tag}${a} style="${attr(st.join(';'))}">${inner}</${tag}>`;
  }

  // Wix-Bild: sichtbarer Ausschnitt (Modus fill/fit, Crop, Ausrichtung) im Rechteck `box`
  function crop(d, c, fit, ax, ay, box) {
    const sc = (fit ? Math.min : Math.max)(box.w / c.width, box.h / c.height);
    const cw = c.width * sc, ch = c.height * sc;
    let ox = (box.w - cw) * ax, oy = (box.h - ch) * ay;
    if (!fit) { ox = Math.min(0, Math.max(box.w - cw, ox)); oy = Math.min(0, Math.max(box.h - ch, oy)); }
    const r = (n) => +n.toFixed(1);
    return { l: r(ox - c.x * sc), t: r(oy - c.y * sc), w: r(d.width * sc), h: r(d.height * sc) };
  }
  // <wow-image>: Angaben in data-image-info
  function image(wow, box) {
    const info = JSON.parse(wow.getAttribute('data-image-info') || '{}');
    const d = info.imageData || {};
    const align = (info.alignType || 'center').toLowerCase();
    const fp = d.focalPoint;
    const ax = fp ? fp.x / 100 : /left/.test(align) ? 0 : /right/.test(align) ? 1 : 0.5;
    const ay = fp ? fp.y / 100 : /top/.test(align) ? 0 : /bottom/.test(align) ? 1 : 0.5;
    return {
      src: 'https://static.wixstatic.com/media/' + d.uri, alt: wow.querySelector('img')?.alt || '',
      img: crop(d, d.crop || { x: 0, y: 0, width: d.width, height: d.height }, /fit/.test(info.displayMode || d.displayMode || ''), ax, ay, box),
    };
  }
  // <img> mit Wix-Transformations-URL (/v1/[crop/x_,y_,w_,h_/]fill|fit/w_,h_,al_..): Originalgröße laden
  const sizes = {};
  const natural = (u) => (sizes[u] ||= new Promise((ok) => {
    const i = new Image();
    i.onload = () => ok({ width: i.naturalWidth, height: i.naturalHeight });
    i.onerror = () => ok(null);
    i.src = u;
  }));
  async function wixImg(el, box) {
    const m = (el.currentSrc || el.src).match(/^(https:\/\/static\.wixstatic\.com\/media\/[^/]+)\/v1\/(.*)$/);
    const d = m && await natural(m[1]);
    if (!d) return null;
    const cm = m[2].match(/crop\/x_(\d+),y_(\d+),w_(\d+),h_(\d+)/);
    const c = cm ? { x: +cm[1], y: +cm[2], width: +cm[3], height: +cm[4] } : { x: 0, y: 0, width: d.width, height: d.height };
    const al = (m[2].match(/al_([a-z]+)/) || [, 'c'])[1];
    const ax = /l/.test(al) ? 0 : /r/.test(al) ? 1 : 0.5;
    const ay = /t/.test(al) ? 0 : /b/.test(al) ? 1 : 0.5;
    return { src: m[1], alt: el.alt, img: crop(d, c, /(^|\/)fit\//.test(m[2]), ax, ay, box) };
  }

  const items = [];
  const unknown = [];
  const boxStyle = (s) => {
    const o = {};
    if (!/, 0\)$/.test(s.backgroundColor)) o.backgroundColor = s.backgroundColor;
    for (const side of ['Top', 'Right', 'Bottom', 'Left']) {
      if (parseFloat(s[`border${side}Width`]) > 0 && s[`border${side}Style`] !== 'none') o[`border${side}`] = s[`border${side}`];
    }
    if (s.borderRadius !== '0px') o.borderRadius = s.borderRadius;
    if (s.boxShadow !== 'none') o.boxShadow = s.boxShadow;
    if (+s.opacity < 1) o.opacity = s.opacity;
    return Object.keys(o).length ? { ...o, boxSizing: 'border-box' } : null;
  };

  async function walk(el) {
    if (!vis(el) || el.id === 'TINY_MENU' || el.id === 'QUICK_ACTION_BAR' || el.id?.endsWith('-pinned-layer')) return;
    const s = getComputedStyle(el);
    if (s.position === 'fixed') return;
    const r = rectOf(el);
    const tid = el.getAttribute('data-testid');
    const cls = el.className?.toString() || '';
    if (tid === 'richTextElement') {
      return items.push({ t: 'html', k: 'text', ...r, html: ser(el, null, true) });
    }
    if (el.tagName === 'A' && /wixui-button/.test(cls) || el.tagName === 'BUTTON' && el.type === 'submit') {
      const html = ser(el, null, true, true).replace(/^(<\w+[^>]* style=")/, '$1height:100%;');
      return items.push({ t: 'html', k: 'button', ...r, html });
    }
    if (el.id?.startsWith('pro-gallery-comp-')) {
      // Wix Pro-Gallery (Slideshow): Bildausschnitt wird später aus den Desktop-Daten berechnet
      const images = [...el.querySelectorAll('[data-hook="item-container"]')].map((c) => {
        const i = c.querySelector('img');
        const cr = rectOf(c);
        return { src: i.currentSrc || i.src, alt: i.alt, w: cr.w, h: cr.h };
      });
      const btn = el.closest('[id^="comp-"]').querySelector('[data-hook="nav-arrow-next"]');
      const br = btn && rectOf(btn);
      const arrow = btn && { x: br.x - r.x, y: br.y - r.y, w: br.w, h: br.h,
        html: ser(btn.querySelector('svg'), null, true).replace(/ style="/, ` style="filter:${getComputedStyle(btn).filter};`) };
      return items.push({ t: 'slides', ...r, images, ...(arrow && { arrow }) });
    }
    if (el.tagName === 'FORM') {
      const start = items.length;
      for (const c of el.children) await walk(c);
      const sub = items.splice(start).map((it) => ({ ...it, x: it.x - r.x, y: it.y - r.y }));
      return items.push({ t: 'form', ...r, items: sub });
    }
    if (el.tagName === 'WOW-IMAGE') {
      if (r.w < 1 || r.h < 1) return;
      const box = el.closest('[id^="bgMedia_"]') ? rectOf(el.closest('[id^="bgMedia_"]')) : r;
      const a = el.closest('a[href]');
      return items.push({ t: 'img', ...box, ...image(el, box), ...(a && { href: a.href }) });
    }
    if (el.tagName === 'IMG') {
      if (r.w < 1 || r.h < 1) return;
      const a = el.closest('a[href]');
      const img = await wixImg(el, r) ?? { src: el.currentSrc || el.src, alt: el.alt, fit: 'contain' };
      return items.push({ t: 'img', ...r, ...img, ...(a && { href: a.href }) });
    }
    if (el.tagName === 'IFRAME') return items.push({ t: 'iframe', ...r, src: el.src, title: el.title });
    if (el.tagName === 'VIDEO') return items.push({ t: 'video', ...r, src: el.currentSrc || el.src });
    if (/^(INPUT|TEXTAREA)$/.test(el.tagName)) {
      const t = el.tagName.toLowerCase();
      const ph = getComputedStyle(el, '::placeholder');
      const html = ser(el, null, true)
        .replace(/^<(\w+)/, `<$1 placeholder="${attr(el.placeholder)}" name="${attr(el.name || el.getAttribute('aria-label') || '')}"${t === 'input' ? ` type="${el.type}"` : ''} data-ph="${attr(`color:${ph.color};font-family:${ph.fontFamily};font-size:${ph.fontSize}`)}"`)
        .replace(/ style="/, ' style="height:100%;');
      return items.push({ t: 'html', k: t, ...r, html: t === 'input' ? html.replace(/<\/input>$/, '') : html });
    }
    if (el.tagName === 'svg' || el.tagName === 'SVG') {
      if (r.w > 0) items.push({ t: 'html', k: 'svg', ...r, html: ser(el, null, true) });
      return;
    }
    if (r.w > 0 && r.h > 0) {
      const b = boxStyle(s);
      if (b) items.push({ t: 'box', ...r, s: b });
      if (s.backgroundImage !== 'none' && /url\(/.test(s.backgroundImage)) unknown.push(`bg-image ${el.id || cls}`);
    }
    if (el.tagName === 'CANVAS' || el.shadowRoot) unknown.push(`${el.tagName} ${el.id || cls}`);
    for (const c of el.children) await walk(c);
  }
  for (const id of rootIds) { const el = document.getElementById(id); if (el) await walk(el); }
  frame.remove();
  return { items, unknown, height: document.getElementById('masterPage').getBoundingClientRect().height,
    bg: document.querySelector('[id^="pageBackground_"] img')?.src || document.querySelector('[id^="pageBackground_"] video')?.src || '' };
}

const round = (it) => ({ ...it, x: Math.round(it.x * 10) / 10, y: Math.round(it.y * 10) / 10 });
const finish = (items, desktop = []) => items.map((it) => {
  const o = round(it);
  if (o.t === 'form') o.items = finish(o.items);
  if (o.t === 'iframe') {
    // wie Desktop: Standard-Google-Maps-Embed statt Wix-Widget, YouTube ohne Cookies
    const kind = /googleMap/.test(o.src) ? 'Google Maps' : /youtube/.test(o.src) ? 'External YouTube' : null;
    const d = desktop.find((x) => x.t === 'iframe' && x.title === kind);
    if (d) Object.assign(o, { src: d.src, title: d.title });
  }
  if (o.t === 'slides') {
    // Ausschnitt wie bei Wix "fill": zentriert, Seitenverhältnis des Originals aus den Desktop-Daten
    const ds = desktop.filter((x) => x.t === 'slides').flatMap((x) => x.images);
    o.images = o.images.map((sl) => {
      const src = mapUrl(sl.src);
      const d = ds.find((x) => x.src === src);
      const ar = d.img.w / d.img.h;
      const w = Math.max(sl.w, sl.h * ar), h = w / ar;
      const r = (n) => Math.round(n * 10) / 10;
      return { src, alt: d.alt, w: sl.w, h: sl.h, img: { l: r((sl.w - w) / 2), t: r((sl.h - h) / 2), w: r(w), h: r(h) } };
    });
  }
  if (o.html) o.html = mapHtml(o.html);
  if (o.src) o.src = mapUrl(o.src);
  if (o.href) o.href = mapUrl(o.href);
  return o;
});

(async () => {
  const browser = await chromium.launch(process.env.PW_CHANNEL ? { channel: process.env.PW_CHANNEL } : {});
  const ctx = await browser.newContext({ ...devices['iPhone 13'], locale: 'de-DE' });
  const page = await ctx.newPage();
  for (const [slug, wixPath] of Object.entries(PAGES)) {
    await page.goto(ORIGIN + encodeURI(wixPath), { waitUntil: 'load', timeout: 60000 });
    // Lazy-Inhalte laden
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 300) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 120)); }
      scrollTo(0, 0);
    });
    await page.waitForTimeout(1500);
    if (slug === 'home') {
      const h = await page.evaluate(extract, ['SITE_HEADER']);
      const file = 'content/header.json';
      const header = JSON.parse(fs.readFileSync(file, 'utf8'));
      header.mobile = finish(h.items);
      fs.writeFileSync(file, JSON.stringify(header, null, 1) + '\n');
    }
    const r = await page.evaluate(extract, ['PAGES_CONTAINER', 'SITE_FOOTER']);
    const file = `content/pages/${slug}.json`;
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    data.mobile = { height: Math.round(r.height), items: finish(r.items, data.items) };
    fs.writeFileSync(file, JSON.stringify(data, null, 1) + '\n');
    console.log(`${slug}: ${r.items.length} Blöcke, Höhe ${Math.round(r.height)}, Hintergrund ${mapUrl(r.bg)}${r.unknown.length ? '\n  ? ' + r.unknown.join('\n  ? ') : ''}`);
  }
  await browser.close();
  if (missing.size) console.log('Nicht zugeordnet:\n  ' + [...missing].join('\n  '));
})();

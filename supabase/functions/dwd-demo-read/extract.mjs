// Pure helpers: read facts from a public homepage. No network access in here.
const STOP = /^(home|homepage|start|contact|contacteer|over ons|over|about|blog|nieuws|nieuws en acties|offerte|offerte aanvragen|vacatures|cookie|cookies|privacy|privacyverklaring|algemene voorwaarden|algemene informatie|disclaimer|login|inloggen|menu|zoeken|search|winkelwagen|mijn account|routebeschrijving|bel ons|bel mij|lees meer|meer info|meer informatie|bekijk alles|alle diensten|diensten|werkzaamheden|projecten|portfolio|reviews|faq|veelgestelde vragen|sitemap|klantenservice|prijslijst|prijzen|tarieven|openingstijden|webshop|shop|afspraak|afspraak maken|boek nu|wie zijn wij|onze producten|wat onze gasten zeggen|onze gasten|nl|en|de)$/i;
const strip = s => String(s || '').replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]*>/g, ' ')
  .replace(/&amp;/g, '&').replace(/&nbsp;|&#160;/g, ' ').replace(/&#0?39;|&apos;|&rsquo;/g, "'").replace(/&quot;|&ldquo;|&rdquo;/g, '"').replace(/&euml;/g, 'ë').replace(/&eacute;/g, 'é')
  .replace(/&#(\d+);/g, (_, n) => { try { return String.fromCodePoint(+n); } catch { return ' '; } }).replace(/\s+/g, ' ').trim();
export function meta(html, key) {
  const a = new RegExp('<meta[^>]+(?:name|property)=["\']' + key + '["\'][^>]*content=["\']([^"\']*)["\']', 'i').exec(html);
  if (a) return strip(a[1]);
  const b = new RegExp('<meta[^>]+content=["\']([^"\']*)["\'][^>]*(?:name|property)=["\']' + key + '["\']', 'i').exec(html);
  return b ? strip(b[1]) : '';
}
function abs(u, base) { try { const x = new URL(u, base); return x.protocol === 'https:' ? x.href : ''; } catch { return ''; } }
function ld(html) {
  const out = [];
  for (const m of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try { const j = JSON.parse(m[1].trim()); const arr = Array.isArray(j) ? j : (j['@graph'] || [j]); for (const o of arr) if (o && typeof o === 'object') out.push(o); } catch { /* ignore */ }
  }
  return out;
}
function rgbOf(h) { h = h.replace('#', ''); if (h.length === 3) h = h.split('').map(c => c + c).join(''); return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)); }
export function hslOf(hex) {
  const [r, g, b] = rgbOf(hex).map(v => v / 255), mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
  let h = 0, s = 0; if (d) { s = d / (1 - Math.abs(2 * l - 1)); h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h = (h * 60 + 360) % 360; }
  return { h, s, l };
}
// standaardkleuren van bouwpakketten (Elementor, WordPress/Gutenberg-palet): zeggen niets over het merk
const DEF = new Set(['#03a9f4', '#f79007', '#00bf87', '#6632ff', '#6ec1e4', '#61ce70', '#4054b2', '#23a455', '#0073aa', '#2271b1', '#007cba',
  '#f78da7', '#cf2e2e', '#ff6900', '#fcb900', '#7bdcb5', '#00d084', '#8ed1fc', '#0693e3', '#9b51e0', '#abb8c3', '#eeeeee', '#313131',
  // Bootstrap 3/4/5-standaardkleuren
  '#337ab7', '#286090', '#23527c', '#2e6da4', '#449d44', '#5cb85c', '#4cae4c', '#5bc0de', '#31b0d5', '#46b8da', '#f0ad4e', '#ec971f', '#eea236', '#d9534f', '#c9302c', '#d43f3a', '#0d6efd', '#198754', '#dc3545', '#ffc107', '#0dcaf0', '#6c757d', '#007bff', '#28a745', '#17a2b8', '#a94442', '#3c763d', '#8a6d3b', '#31708f', '#ffc439', '#0070ba', '#003087',
  // merkkleuren van sociale media en betaal-/reviewlogo's (iconen in de footer)
  '#1877f2', '#3b5998', '#4267b2', '#0a66c2', '#0077b5', '#1c86c6', '#25d366', '#5bba67', '#128c7e', '#e4405f', '#c13584', '#833ab4', '#fd1d1d', '#ff0000', '#cd201f', '#1da1f2', '#55acee', '#bd081c', '#e60023', '#00b67a', '#4285f4', '#34a853', '#fbbc05', '#ea4335', '#ff4500', '#6441a5', '#1ed760', '#1db954']);
export function pickColors(css, themeColors) {
  const w = new Map();
  // WordPress-presets en hun hulpklassen weghalen: dat is het standaardpalet van het thema, niet de huisstijl
  css = css.replace(/--wp--preset--[\w-]+\s*:[^;}]*;?/g, '').replace(/\.has-[\w-]+?-(?:background-|border-)?color[^{]*\{[^}]*\}/g, '').replace(/--wp--[\w-]+\s*:[^;}]*;?/g, '');
  const add = (hex, wt) => { hex = '#' + hex.replace('#', '').toLowerCase(); if (hex.length === 4) hex = '#' + hex.slice(1).split('').map(c => c + c).join(''); if (!/^#[0-9a-f]{6}$/.test(hex)) return; if (DEF.has(hex) && wt < 40) return; w.set(hex, (w.get(hex) || 0) + wt); };
  for (const m of css.matchAll(/--ast-global-color-([01])\s*:\s*(#[0-9a-fA-F]{3,6})\b/g)) add(m[2], m[1] === '0' ? 55 : 45);   // Astra-thema: ingestelde merkkleuren
  for (const m of css.matchAll(/--e-global-color-(primary|accent)\s*:\s*(#[0-9a-fA-F]{3,6})\b/g)) add(m[2], m[1] === 'primary' ? 60 : 30);
  for (const m of css.matchAll(/--[\w-]*(?:primary|accent|brand|main|theme|kleur|color)[\w-]*\s*:\s*(#[0-9a-fA-F]{3,6})\b/g)) add(m[1], 12);
  for (const m of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const sel = m[1], body = m[2];
    if (/(^|[\s,.#])(h[1-3]|button|\.btn|[\w-]*button[\w-]*|[\w-]*heading[\w-]*|[\w-]*title[\w-]*)\b/i.test(sel)) for (const c of body.matchAll(/(?:^|;)\s*(?:color|background(?:-color)?)\s*:\s*(#[0-9a-fA-F]{3,6})\b/gi)) add(c[1], 6);
  }
  for (const m of css.matchAll(/#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g)) add(m[1], 1);
  for (const t of themeColors) if (/^#[0-9a-fA-F]{3,6}$/.test(t || '')) add(t, 30);
  const cand = [...w.entries()].filter(([, n]) => n > 2).map(([hex, n]) => ({ hex, n, ...hslOf(hex) })).filter(c => c.s >= .22 && c.l >= .14 && c.l <= .85).sort((a, b) => b.n - a.n);
  if (!cand.length) return [];
  const first = cand[0], second = cand.slice(1).find(c => Math.min(Math.abs(c.h - first.h), 360 - Math.abs(c.h - first.h)) > 28);
  return [first.hex, second ? second.hex : null];
}
const LIGHTLOGO = /(^|[\/_.-])(wit|white|negatief|inverse|light|reversed)([._-]|\d|$)/i;
export function extract(html, baseUrl) {
  const j = ld(html);
  const biz = j.find(o => /LocalBusiness|Organization|Store|Plumber|Electrician|HomeAndConstructionBusiness|ProfessionalService|Painter|Contractor|BeautySalon|HairSalon|HealthAndBeautyBusiness/i.test([].concat(o['@type'] || []).join(' '))) || {};
  const title = strip((/<title[^>]*>([\s\S]*?)<\/title>/i.exec(html) || [])[1]);
  const description = meta(html, 'description') || meta(html, 'og:description');
  let name = meta(html, 'og:site_name') || strip(biz.name || '');
  if (!name && title) { const parts = title.split(/\s[|–—\-·•]\s/).map(s => s.trim()).filter(Boolean); name = parts.sort((a, b) => a.length - b.length)[0] || title; }
  name = name.slice(0, 60);
  const h1 = strip((/<h1[^>]*>([\s\S]*?)<\/h1>/i.exec(html) || [])[1]).slice(0, 140);
  // logo: liefst een donkere/gekleurde versie, geen witte
  let logo = '';
  const bl = typeof biz.logo === 'string' ? biz.logo : (biz.logo && biz.logo.url) || '';
  if (bl) logo = abs(bl, baseUrl);
  if (!logo || LIGHTLOGO.test(logo)) {
    let fallback = '';
    for (const m of html.slice(0, 200000).matchAll(/<img\b[^>]*>/gi)) {
      const tag = m[0]; if (!/logo/i.test(tag)) continue;
      const s = /\bsrc=["']([^"']+)["']/i.exec(tag) || /data-src=["']([^"']+)["']/i.exec(tag); if (!s || /^data:/i.test(s[1])) continue;
      const u = abs(s[1], baseUrl); if (!u) continue;
      if (LIGHTLOGO.test(u)) { if (!fallback) fallback = u; continue; }
      logo = u; break;
    }
    if (!logo || LIGHTLOGO.test(logo)) logo = logo || fallback;
  }
  if (!logo) { const a = /<link[^>]+rel=["'][^"']*apple-touch-icon[^"']*["'][^>]*href=["']([^"']+)["']/i.exec(html); if (a) logo = abs(a[1], baseUrl); }
  const ogImage = abs(meta(html, 'og:image'), baseUrl);
  // phone
  let phone = ''; const t = /href=["']tel:([^"']+)["']/i.exec(html); if (t) phone = decodeURIComponent(t[1]).replace(/[^\d+]/g, '').slice(0, 16);
  if (!phone && biz.telephone) phone = String(biz.telephone).replace(/[^\d+]/g, '').slice(0, 16);
  const text = strip(html.slice(0, 400000).replace(/<(?:br|\/p|\/div|\/li|\/h\d)[^>]*>/gi, ' | '));
  if (!phone) { const pm = /(?:tel(?:efoon)?|bel|mobiel|t)\s*[:.]?\s*((?:\+31|0031|0)\s?[1-9](?:[\s-]?\d){8})/i.exec(text) || /((?:\+31|0031|0)\s?[1-9](?:[\s-]?\d){8})/.exec(text); if (pm) phone = pm[1].replace(/[^\d+]/g, '').slice(0, 16); }
  let email = ''; const em = /href=["']mailto:([^"'?]+)/i.exec(html) || /([\w.+-]+@[\w-]+\.[\w.-]+)/.exec(text); if (em) email = em[1].toLowerCase().slice(0, 80);
  let address = ''; const am = /([A-Z][A-Za-zÀ-ſ'.\- ]{2,40}),?\s+(\d{1,4}\s?[A-Za-z]?),?\s+(\d{4}\s?[A-Z]{2}),?\s+([A-Z][A-Za-zÀ-ſ()'.\-]{2,30}(?: (?:aan|op|de|den|ter|en) [A-Z][a-z]+)?)/.exec(text.replace(/\|/g, ' ')); if (am) address = (am[1].replace(/^.*?:\s*/, '').trim() + ' ' + am[2] + ', ' + am[3].replace(/\s/g, '') .replace(/^(\d{4})([A-Z]{2})$/, '$1 $2') + ' ' + am[4].trim()).slice(0, 90);
  let tagline = ''; const ai = html.search(/<\/h1>/i); if (ai > -1) { const nxt = strip(html.slice(ai, ai + 1500)); const first = nxt.split(/\s{2,}|\.\s/)[0] || ''; const alt = nxt.slice(0, 120).trim(); tagline = (first.length >= 15 && first.length <= 120 ? first : alt.length >= 15 ? alt : '').replace(/\s+(boek|webshop|bekijk|lees|neem|vraag).*$/i, '').trim(); }
  const images = []; for (const m of html.slice(0, 400000).matchAll(/<img\b[^>]*>/gi)) { const tg = m[0]; if (/logo|icon|favicon|sprite|flag|avatar|emoji|pixel|spacer|whatsapp|anbos|keurmerk|badge|certific/i.test(tg)) continue; const sm = /\b(?:data-src|src)=["']([^"']+)["']/i.exec(tg); if (!sm || /^data:/i.test(sm[1])) continue; if (!/\.(jpe?g|png|webp)(\?|$)/i.test(sm[1])) continue; const u = abs(sm[1], baseUrl); if (u && !images.includes(u)) images.push(u); if (images.length >= 6) break; }
  // diensten: menu-items uit nav/header, maar ook uit de hele pagina (veel sites gebruiken div-menu's)
  const navs = [...html.matchAll(/<(nav|header)\b[\s\S]*?<\/\1>/gi)].map(m => m[0]).join(' ');
  const rx = /<a\b[^>]*href=["']([^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi;
  const anchors = [...navs.matchAll(rx)].map(m => ({ href: m[1], text: strip(m[2]) }));
  const pageAnchors = [...html.slice(0, 400000).matchAll(rx)].map(m => ({ href: m[1], text: strip(m[2]) }));
  const good = /diens|werk|service|product|aanbod|special|oplossing|behandel|massage|gezicht|nagel|pedicure|manicure|wimper|wenkbrauw|ontharing|epileren|waxen|peeling|huid|haar|knip|kleur|lichaam|therapie|training|les|menu/i;
  const hrefGood = a => { try { return good.test(new URL(a.href, baseUrl).pathname); } catch { return false; } };
  const cands = [];
  const push = (txt, pri) => { txt = txt.replace(/\s*[»›>→]+\s*$/, '').trim(); if (txt.length < 3 || txt.length > 42 || txt.split(' ').length > 5 || STOP.test(txt) || /^(onze|ons|ontdek|bekijk|lees|neem|vraag|waarom|wat|hoe|jouw|uw|wie)\b/i.test(txt)) return; if (!cands.some(c => c.t.toLowerCase() === txt.toLowerCase())) cands.push({ t: txt, p: pri }); };
  anchors.filter(a => hrefGood(a)).forEach(a => push(a.text, 1));
  pageAnchors.filter(a => hrefGood(a)).forEach(a => push(a.text, 2));
  for (const m of html.matchAll(/<h[23][^>]*>([\s\S]*?)<\/h[23]>/gi)) push(strip(m[1]), 3);
  anchors.forEach(a => push(a.text, 4));
  const services = cands.sort((a, b) => a.p - b.p).slice(0, 6).map(c => c.t);
  const signals = [title, description, h1, anchors.map(a => a.text).join(' '), [...html.matchAll(/<h[23][^>]*>([\s\S]*?)<\/h[23]>/gi)].slice(0, 12).map(m => strip(m[1])).join(' '), services.join(' ')].join(' ').toLowerCase().slice(0, 1800);
  const styleBlocks = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map(m => m[1]).join('\n') + '\n' + [...html.matchAll(/<[^>]*\bstyle=["']([^"']*)["'][^>]*>/gi)].filter(m => !/facebook|instagram|linkedin|youtube|twitter|x\.com|tiktok|whatsapp|pinterest|social|share|wa\.me/i.test(m[0])).map(m => m[1]).join('\n');
  const allSheets = [...html.matchAll(/<link[^>]+rel=["']stylesheet["'][^>]*>/gi)].map(m => /href=["']([^"']+)["']/i.exec(m[0])).filter(Boolean).map(m => abs(m[1], baseUrl)).filter(Boolean);
  const rank = u => /\/plugins\/|wp-includes|fonts\.googleapis|fontawesome|font-awesome|\/themes\/[^\/]+\/assets\/|\.min\.css|bootstrap|animate|slick|swiper|owl\.|fancybox|lightbox|jquery|normalize|reset\.css|cookie/i.test(u) && !/elementor\/css\/post-|\/uploads\//i.test(u) ? 2 : /\/uploads\/|\/themes\/|elementor\/css\/post-|\/css\/(style|main|app|theme|custom)/i.test(u) ? 0 : 1;
  const sheets = allSheets.map((u, i) => ({ u, i, r: rank(u) })).filter(x => x.r < 2).sort((a, b) => a.r - b.r || a.i - b.i).map(x => x.u).slice(0, 4);
  const themeColors = [meta(html, 'theme-color'), meta(html, 'msapplication-TileColor')];
  return { name, title, description: description.slice(0, 220), h1, logo, og_image: ogImage, phone, email, address, tagline, images, services, signals, styleBlocks, sheets, themeColors };
}

// Kleuren uit het logo (pixels RGBA): het sterkste merksignaal. Geeft {colors:[hex..], neutral:bool, dark:bool}.
export function logoColors(px, width, height) {
  const bins = new Map(); let opaque = 0, darkN = 0, lightN = 0, colN = 0;
  const step = Math.max(1, Math.floor(Math.sqrt(width * height / 40000)));
  for (let y = 0; y < height; y += step) for (let x = 0; x < width; x += step) {
    const i = (y * width + x) * 4, a = px[i + 3]; if (a < 200) continue;
    const r = px[i], g = px[i + 1], b = px[i + 2]; opaque++;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 510, s = mx === mn ? 0 : (mx - mn) / (255 - Math.abs(mx + mn - 255));
    if (l > .92) { lightN++; continue; }
    if (s < .2 || l < .08) { if (l < .3) darkN++; continue; }
    colN++;
    const k = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4); const e = bins.get(k) || [0, 0, 0, 0];
    e[0] += r; e[1] += g; e[2] += b; e[3]++; bins.set(k, e);
  }
  const hex = (r, g, b) => '#' + [r, g, b].map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
  const top = [...bins.values()].sort((a, b) => b[3] - a[3]).map(e => hex(e[0] / e[3], e[1] / e[3], e[2] / e[3]));
  const out = [];
  for (const c of top) { const h = hslOf(c); if (out.every(o => { const q = hslOf(o); return Math.min(Math.abs(q.h - h.h), 360 - Math.abs(q.h - h.h)) > 25; })) out.push(c); if (out.length >= 2) break; }
  const neutral = opaque > 0 && colN / opaque < .06;
  // een foto (geen logo): veel verschillende kleuren en geen transparantie -> niet als merkkleur gebruiken
  const total = Math.ceil(width / step) * Math.ceil(height / step);
  const busy = [...bins.values()].filter(e => e[3] > colN * .004).length;
  const photo = opaque > total * .97 && busy > 45;
  return { colors: !photo && colN / Math.max(1, opaque) >= .03 ? out : [], neutral: neutral && !photo, dark: neutral && !photo && darkN >= lightN * .3, photo };
}

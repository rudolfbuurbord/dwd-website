import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { decode } from "https://deno.land/x/imagescript@1.3.0/mod.ts";
import { safeFetch } from "./net.ts";
import { extract, pickColors, logoColors, hslOf } from "./extract.mjs";

const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
const ORIGINS = ["https://dewebsitedokters.nl", "https://www.dewebsitedokters.nl"];
const HOUR_LIMIT = 12;
const CACHE_DAYS = 7;

function cors(req: Request) {
  const o = req.headers.get("origin") || "";
  return { "Access-Control-Allow-Origin": ORIGINS.includes(o) ? o : ORIGINS[0], "Access-Control-Allow-Headers": "content-type, apikey, authorization", "Access-Control-Allow-Methods": "POST, OPTIONS", "Vary": "Origin" };
}
const json = (req: Request, body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors(req), "Content-Type": "application/json" } });
async function sha(s: string) { const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)); return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, "0")).join("").slice(0, 32); }

// Beveiliging (audit 26-11): echte bezoekers-IP. Cloudflare zet cf-connecting-ip en weigert een vervalste;
// de eerste waarde van X-Forwarded-For vult de bezoeker zelf in, dus daarvan alleen de laatste (door de proxy toegevoegde).
function clientIp(req: Request) {
  const cf = (req.headers.get("cf-connecting-ip") || "").trim();
  if (cf) return cf;
  const xff = (req.headers.get("x-forwarded-for") || "").split(",").map(s => s.trim()).filter(Boolean);
  return xff.length ? xff[xff.length - 1] : "x";
}
// Gescrapete tekst is data: geen < of > (de funnel escapet al, dit is een tweede slot).
// deno-lint-ignore no-explicit-any
function clean(v: any): any {
  if (typeof v === "string") return v.replace(/[<>]/g, " ");
  if (Array.isArray(v)) return v.map(clean);
  if (v && typeof v === "object") { const o: Record<string, unknown> = {}; for (const k of Object.keys(v)) o[k] = clean(v[k]); return o; }
  return v;
}

// Kleuren uit het logo lezen (png/jpg/gif); het logo is het sterkste merksignaal.
async function fromLogo(url: string) {
  if (!url || !/\.(png|jpe?g|gif)(\?|$)/i.test(url)) return null;
  try {
    const r = await safeFetch(url, "image/*", 2500000);
    const img = await decode(r.bytes);
    // deno-lint-ignore no-explicit-any
    const im: any = img; if (!im.bitmap) return null;
    if (im.width > 400) im.resize(400, -1);
    return logoColors(im.bitmap, im.width, im.height);
  } catch { return null; }
}

function combine(css: (string | null)[], lc: { colors: string[]; neutral: boolean; dark: boolean; photo?: boolean } | null) {
  if (lc && lc.photo) lc = null;   // het 'logo' is een foto: daar zeggen de kleuren niets over het merk
  const hueFar = (a: string, b: string) => { const x = hslOf(a), y = hslOf(b); return Math.min(Math.abs(x.h - y.h), 360 - Math.abs(x.h - y.h)) > 28; };
  if (lc && lc.colors.length) {
    const second = lc.colors[1] || css.find(c => c && hueFar(c, lc.colors[0])) || null;
    return { colors: [lc.colors[0], second], bron: "logo" };
  }
  if (lc && lc.neutral) return { colors: ["#111111", css[0] || null], bron: "logo-neutraal" };
  return { colors: css, bron: "site" };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(req) });
  if (req.method !== "POST") return json(req, { ok: false, reason: "method" }, 405);
  const origin = req.headers.get("origin") || "";
  if (!ORIGINS.includes(origin)) return json(req, { ok: false, reason: "origin" }, 403);
  let input = ""; try { input = String((await req.json()).url || ""); } catch { return json(req, { ok: false, reason: "input" }, 400); }
  const domain = input.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").split(/[\/?#]/)[0];
  if (!/^(?=.{4,253}$)([a-z0-9-]{1,63}\.)+[a-z]{2,}$/.test(domain)) return json(req, { ok: false, reason: "domain" });

  const { data: hit } = await sb.from("dwd_demo_cache").select("facts,fetched_at").eq("domain", domain).maybeSingle();
  if (hit && hit.facts && hit.facts.colors_bron && Date.now() - new Date(hit.fetched_at).getTime() < CACHE_DAYS * 864e5) return json(req, { ok: true, cached: true, facts: clean(hit.facts) });

  const ip = clientIp(req);
  const ipHash = await sha(ip + "|dwd");
  const since = new Date(Date.now() - 3600e3).toISOString();
  const { count } = await sb.from("dwd_demo_hits").select("id", { count: "exact", head: true }).eq("ip_hash", ipHash).gte("created_at", since);
  if ((count || 0) >= HOUR_LIMIT) return json(req, { ok: false, reason: "rate" }, 429);
  await sb.from("dwd_demo_hits").insert({ ip_hash: ipHash });

  try {
    let page;
    try { page = await safeFetch("https://" + domain + "/"); }
    catch { page = await safeFetch("https://www." + domain + "/"); }
    const x = extract(page.body, page.url);
    let css = x.styleBlocks;
    for (const s of x.sheets) { try { css += "\n" + (await safeFetch(s, "text/css", 400000)).body; } catch { /* sheet optional */ } }
    const cssCols = pickColors(css, x.themeColors);
    const lc = await fromLogo(x.logo);
    const { colors, bron } = combine(cssCols, lc);
    const facts = clean({ domain, name: x.name, description: x.description, h1: x.h1, tagline: x.tagline, logo: x.logo, og_image: x.og_image, images: x.images, phone: x.phone, email: x.email, address: x.address, services: x.services, signals: x.signals, colors, colors_bron: bron, logo_neutraal: !!(lc && lc.neutral && !lc.photo), logo_foto: !!(lc && lc.photo) });
    await sb.from("dwd_demo_cache").upsert({ domain, facts, fetched_at: new Date().toISOString() });
    return json(req, { ok: true, facts });
  } catch (e) {
    return json(req, { ok: false, reason: String((e as Error).message || "error").slice(0, 40) });
  }
});

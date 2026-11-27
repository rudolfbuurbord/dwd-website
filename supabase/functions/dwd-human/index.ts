import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// Controleert een Cloudflare Turnstile-token uit de funnel en legt bij succes een 'mens-bewijs' vast
// (client-id + gehashte IP, 3 uur geldig). De demo-aanvragen in de database kijken daarnaar.
// De geheime Turnstile-sleutel staat alleen in Supabase Vault (turnstile_secret).
const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
const ORIGINS = ["https://dewebsitedokters.nl", "https://www.dewebsitedokters.nl"];
let secret: string | null = null;

function cors(req: Request) {
  const o = req.headers.get("origin") || "";
  return { "Access-Control-Allow-Origin": ORIGINS.includes(o) ? o : ORIGINS[0], "Access-Control-Allow-Headers": "content-type, apikey, authorization", "Access-Control-Allow-Methods": "POST, OPTIONS", "Vary": "Origin" };
}
const json = (req: Request, body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors(req), "Content-Type": "application/json", "Cache-Control": "no-store" } });
function clientIp(req: Request) {
  const cf = (req.headers.get("cf-connecting-ip") || "").trim();
  if (cf) return cf;
  const xff = (req.headers.get("x-forwarded-for") || "").split(",").map(s => s.trim()).filter(Boolean);
  return xff.length ? xff[xff.length - 1] : "";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(req) });
  if (req.method !== "POST") return json(req, { ok: false }, 405);
  if (!ORIGINS.includes(req.headers.get("origin") || "")) return json(req, { ok: false, reason: "origin" }, 403);
  let token = "", client = "";
  try { const b = await req.json(); token = String(b.token || "").slice(0, 4096); client = String(b.client || "").slice(0, 64); } catch { return json(req, { ok: false, reason: "input" }, 400); }
  if (token.length < 10) return json(req, { ok: false, reason: "token" }, 400);
  if (!secret) { const { data } = await sb.rpc("dwd_turnstile_secret"); secret = typeof data === "string" && data ? data : null; }
  if (!secret) return json(req, { ok: false, reason: "config" }, 500);
  const ip = clientIp(req);
  const form = new URLSearchParams({ secret, response: token });
  if (ip) form.set("remoteip", ip);
  try {
    const r = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body: form });
    const d = await r.json();
    const hostOk = !d.hostname || /(^|\.)dewebsitedokters\.nl$/.test(String(d.hostname));
    if (!d.success || !hostOk) return json(req, { ok: false, reason: "failed" }, 403);
    await sb.rpc("dwd_human_grant", { p_client: client, p_ip: ip });
    return json(req, { ok: true });
  } catch {
    return json(req, { ok: false, reason: "verify_error" }, 502);
  }
});

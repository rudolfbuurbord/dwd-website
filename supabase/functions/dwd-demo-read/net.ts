// Safe fetch for the Supabase Edge Runtime: connect to a validated public IPv4, then speak TLS to the real hostname.
export function isPublicIPv4(ip: string): boolean {
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(ip); if (!m) return false;
  const [a, b, c] = [+m[1], +m[2], +m[3]];
  return !(a === 0 || a === 10 || a === 127 || a >= 224 || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) || (a === 192 && (b === 168 || b === 0 || (b === 88 && c === 99))) ||
    (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100))) || (a === 203 && b === 0 && c === 113));
}
export function checkedURL(input: string): URL {
  const u = new URL(input);
  if (u.protocol !== 'https:' || u.username || u.password || (u.port && u.port !== '443') || /^\d+\.\d+\.\d+\.\d+$/.test(u.hostname) || u.hostname.includes(':') ||
    !u.hostname.includes('.') || /\.(invalid|localhost|local|internal|test|example)$/i.test(u.hostname)) throw Object.assign(new Error('URL_NOT_PUBLIC_HTTPS'), { code: 'URL_BLOCKED' });
  return u;
}
function decodeHTTP(bytes: Uint8Array, maxBytes: number) {
  let boundary = -1;
  for (let i = 0; i < Math.min(bytes.length - 3, 32768); i++) if (bytes[i] === 13 && bytes[i + 1] === 10 && bytes[i + 2] === 13 && bytes[i + 3] === 10) { boundary = i; break; }
  if (boundary < 0) throw new Error('INVALID_HTTP');
  const lines = new TextDecoder().decode(bytes.subarray(0, boundary)).split('\r\n');
  const status = Number(lines.shift()?.match(/^HTTP\/1\.[01] (\d{3})/)?.[1]); if (!status) throw new Error('INVALID_HTTP');
  const h: Record<string, string> = {};
  for (const line of lines) { const p = line.indexOf(':'); if (p > 0) { const k = line.slice(0, p).toLowerCase(); h[k] = h[k] ? h[k] + ', ' + line.slice(p + 1).trim() : line.slice(p + 1).trim(); } }
  if (h['content-encoding'] && h['content-encoding'] !== 'identity') throw new Error('UNSUPPORTED_ENCODING');
  let body = bytes.subarray(boundary + 4);
  if ((h['transfer-encoding'] || '').toLowerCase() === 'chunked') {
    const chunks: Uint8Array[] = []; let off = 0, total = 0;
    while (off < body.length) {
      let end = off; while (end < body.length - 1 && !(body[end] === 13 && body[end + 1] === 10)) end++;
      const size = parseInt(new TextDecoder().decode(body.subarray(off, end)).split(';')[0], 16); if (Number.isNaN(size)) throw new Error('BAD_CHUNK');
      off = end + 2; if (size === 0) break;
      total += size; if (total > maxBytes) throw new Error('BODY_TOO_LARGE');
      chunks.push(body.subarray(off, off + size)); off += size + 2;
    }
    body = new Uint8Array(total); let o = 0; for (const c of chunks) { body.set(c, o); o += c.length; }
  }
  if (body.length > maxBytes) throw new Error('BODY_TOO_LARGE');
  return { status, location: h.location, type: h['content-type'] || '', bytes: body, body: new TextDecoder().decode(body) };
}
export async function safeFetch(input: string, accept = 'text/html', maxBytes = 600000): Promise<{ status: number; type: string; body: string; bytes: Uint8Array; url: string }> {
  let url = checkedURL(input);
  for (let hop = 0; hop <= 3; hop++) {
    const addrs = await Deno.resolveDns(url.hostname, 'A');
    if (!addrs.length || addrs.some((a: string) => !isPublicIPv4(a))) throw Object.assign(new Error('DNS_NOT_PUBLIC'), { code: 'URL_BLOCKED' });
    let conn: Deno.Conn | undefined; let timedOut = false;
    const timer = setTimeout(() => { timedOut = true; try { conn?.close(); } catch { /* */ } }, 6000);
    let res;
    try {
      conn = await Deno.connect({ hostname: addrs[0], port: 443 });
      conn = await Deno.startTls(conn as Deno.TcpConn, { hostname: url.hostname, alpnProtocols: ['http/1.1'] });
      const wire = new TextEncoder().encode(`GET ${url.pathname}${url.search} HTTP/1.1\r\nHost: ${url.hostname}\r\nUser-Agent: DeWebsiteDokter-Research/1.0 (+https://dewebsitedokters.nl)\r\nAccept: ${accept}\r\nAccept-Encoding: identity\r\nConnection: close\r\n\r\n`);
      let sent = 0; while (sent < wire.length) sent += await conn.write(wire.subarray(sent));
      const chunks: Uint8Array[] = []; let total = 0;
      while (true) { const buf = new Uint8Array(16384); let n: number | null; try { n = await conn.read(buf); } catch (e) { if (total > 0 && /close_notify|peer closed|unexpected eof|eof/i.test(String((e as Error).message))) break; throw e; } if (n === null) break; total += n; if (total > maxBytes + 20000) throw new Error('BODY_TOO_LARGE'); chunks.push(buf.slice(0, n)); }
      const all = new Uint8Array(total); let o = 0; for (const c of chunks) { all.set(c, o); o += c.length; }
      res = decodeHTTP(all, maxBytes);
    } catch (e) { if (timedOut) throw new Error('FETCH_TIMEOUT'); throw e; }
    finally { clearTimeout(timer); try { conn?.close(); } catch { /* */ } }
    if (res.status >= 300 && res.status < 400 && res.location) { url = checkedURL(new URL(res.location, url).href); continue; }
    const want = accept.startsWith('image') ? 'image' : (accept.split('/')[1] === 'css' ? 'css' : 'html');
    if (!res.type.toLowerCase().includes(want)) throw new Error('WRONG_TYPE');
    return { ...res, url: url.href };
  }
  throw new Error('TOO_MANY_REDIRECTS');
}

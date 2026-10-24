import { BadRequestException } from '@nestjs/common';
import { lookup } from 'node:dns/promises';
import { lookup as lookupCb } from 'node:dns';
import https from 'node:https';
import { isIP } from 'node:net';
import { Readable } from 'node:stream';

const MAX_REDIRECTS = 5;
const TIMEOUT_MS = Number(process.env.LINK_FETCH_TIMEOUT_MS) || 10 * 60 * 1000;

/** True for loopback, private, link-local, reserved, multicast and other non-public addresses (blocks reaching internal services). */
function isPrivateIp(ip: string): boolean {
  if (ip.includes(':')) {
    const v = ip.toLowerCase();
    if (v.startsWith('::ffff:')) return true; // IPv4-mapped: never a legitimate public target here
    return v === '::1' || v === '::' || v.startsWith('fc') || v.startsWith('fd') || /^fe[89ab]/.test(v) || v.startsWith('ff') || v.startsWith('2001:db8');
  }
  const [a, b, c] = ip.split('.').map(Number);
  return (
    a === 0 || a === 10 || a === 127 || a >= 224 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 192 && b === 0 && (c === 0 || c === 2)) ||
    (a === 198 && (b === 18 || b === 19)) ||
    (a === 198 && b === 51 && c === 100) ||
    (a === 203 && b === 0 && c === 113) ||
    (a === 100 && b >= 64 && b <= 127)
  );
}

/**
 * DNS lookup used by the actual connection. Checking the address here (rather than resolving once up front and then
 * letting fetch resolve again) means a hostname cannot answer "public" to the check and "internal" to the connection.
 */
const safeLookup: typeof lookupCb = ((hostname: string, options: any, cb: any) => {
  lookupCb(hostname, { ...options, all: true }, (err, addrs: any) => {
    if (err) return cb(err);
    if (!addrs.length || addrs.some((a: { address: string }) => isPrivateIp(a.address))) return cb(new Error('That link cannot be used.'));
    return options?.all ? cb(null, addrs) : cb(null, addrs[0].address, addrs[0].family);
  });
}) as typeof lookupCb;

/** One GET over https with the address check above; redirects are returned, never followed. */
function request(u: URL, signal: AbortSignal): Promise<Response> {
  return new Promise((resolve, reject) => {
    const req = https.request(u, { method: 'GET', headers: { 'User-Agent': 'Mozilla/5.0 (TradeBit book importer)' }, lookup: safeLookup, signal }, (res) => {
      const headers = new Headers();
      for (const [k, v] of Object.entries(res.headers)) if (v !== undefined) headers.set(k, Array.isArray(v) ? v.join(', ') : v);
      const status = res.statusCode ?? 0;
      if ([204, 205, 304].includes(status)) {
        res.resume();
        return resolve(new Response(null, { status, headers }));
      }
      resolve(new Response(Readable.toWeb(res) as unknown as ReadableStream, { status, headers }));
    });
    req.on('error', reject);
    req.end();
  });
}

async function assertPublicHttps(raw: string): Promise<URL> {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    throw new BadRequestException('That is not a valid link.');
  }
  if (u.protocol !== 'https:' || u.username || u.password) throw new BadRequestException('The link must be a plain https:// link.');
  const addrs = isIP(u.hostname) ? [{ address: u.hostname }] : await lookup(u.hostname, { all: true }).catch(() => []);
  if (!addrs.length || addrs.some((a) => isPrivateIp(a.address))) throw new BadRequestException('That link cannot be used.');
  return u;
}

/** Turns a Google Drive / Dropbox share link into a direct-download link; anything else is used as given. */
export function toDirectLink(raw: string): string {
  let u: URL;
  try {
    u = new URL(raw.trim());
  } catch {
    throw new BadRequestException('That is not a valid link.');
  }
  const host = u.hostname.toLowerCase();
  if (host === 'drive.google.com' || host === 'docs.google.com') {
    const id = u.pathname.match(/\/d\/([\w-]+)/)?.[1] || u.searchParams.get('id');
    if (!id) throw new BadRequestException('Could not find the file id in that Google Drive link.');
    return `https://drive.usercontent.google.com/download?id=${encodeURIComponent(id)}&export=download&confirm=t`;
  }
  if (host.endsWith('dropbox.com')) {
    u.searchParams.delete('raw');
    u.searchParams.set('dl', '1');
    return u.toString();
  }
  return u.toString();
}

async function get(raw: string, signal: AbortSignal): Promise<Response> {
  let url = raw;
  for (let i = 0; i <= MAX_REDIRECTS; i++) {
    const u = await assertPublicHttps(url);
    const res = await request(u, signal);
    if (res.status >= 300 && res.status < 400 && res.headers.get('location')) {
      await res.body?.cancel().catch(() => undefined);
      url = new URL(res.headers.get('location')!, u).toString();
      continue;
    }
    return res;
  }
  throw new BadRequestException('The link redirected too many times.');
}

async function readCapped(res: Response, maxBytes: number): Promise<Buffer> {
  const mb = Math.round(maxBytes / 1024 / 1024);
  const declared = Number(res.headers.get('content-length'));
  if (declared && declared > maxBytes) throw new BadRequestException(`The file is larger than ${mb}MB.`);
  const chunks: Buffer[] = [];
  let total = 0;
  for await (const chunk of res.body as unknown as AsyncIterable<Uint8Array>) {
    total += chunk.length;
    if (total > maxBytes) throw new BadRequestException(`The file is larger than ${mb}MB.`);
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

/** Downloads a PDF from a share/direct link, handling Google Drive's large-file confirmation page. */
export async function fetchPdfFromLink(link: string, maxBytes: number): Promise<Buffer> {
  const signal = AbortSignal.timeout(TIMEOUT_MS);
  let res = await get(toDirectLink(link), signal);

  // Drive answers some large files with an HTML page holding a hidden confirm form; submit it once.
  if ((res.headers.get('content-type') || '').includes('text/html')) {
    const page = await res.text();
    const action = page.match(/<form[^>]+action="([^"]+)"/)?.[1]?.replace(/&amp;/g, '&');
    if (action) {
      const target = new URL(action);
      for (const m of page.matchAll(/<input[^>]+type="hidden"[^>]*>/g)) {
        const name = m[0].match(/name="([^"]+)"/)?.[1];
        const value = m[0].match(/value="([^"]*)"/)?.[1] ?? '';
        if (name) target.searchParams.set(name, value.replace(/&amp;/g, '&'));
      }
      res = await get(target.toString(), signal);
    }
  }

  if (!res.ok) throw new BadRequestException(`The link could not be downloaded (HTTP ${res.status}). Is it shared as "Anyone with the link"?`);
  const buf = await readCapped(res, maxBytes);
  if (buf.subarray(0, 5).toString('latin1') !== '%PDF-') {
    throw new BadRequestException('The link did not return a PDF. Check it is shared as "Anyone with the link" and points to the file.');
  }
  return buf;
}

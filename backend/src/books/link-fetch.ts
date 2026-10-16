import { BadRequestException } from '@nestjs/common';
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

const MAX_REDIRECTS = 5;
const TIMEOUT_MS = Number(process.env.LINK_FETCH_TIMEOUT_MS) || 10 * 60 * 1000;

/** True for loopback, private, link-local and other non-public addresses (blocks reaching internal services). */
function isPrivateIp(ip: string): boolean {
  if (ip.includes(':')) {
    const v = ip.toLowerCase();
    return v === '::1' || v === '::' || v.startsWith('fc') || v.startsWith('fd') || v.startsWith('fe80') || v.startsWith('::ffff:');
  }
  const [a, b] = ip.split('.').map(Number);
  return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127);
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
    const res = await fetch(u, { redirect: 'manual', signal, headers: { 'User-Agent': 'Mozilla/5.0 (TradeBit book importer)' } });
    if (res.status >= 300 && res.status < 400 && res.headers.get('location')) {
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

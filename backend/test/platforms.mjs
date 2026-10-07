// Trading platforms: validation, exact referral redirect, click counting, logo upload, admin-only management.
// Run: npm run build && node test/platforms.mjs
import { spawn, execSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import assert from 'node:assert/strict';
import EmbeddedPostgres from 'embedded-postgres';

const PG_PORT = 54341;
const API_PORT = 3985;
const BASE = `http://127.0.0.1:${API_PORT}/api/v1`;
const dataDir = mkdtempSync(join(tmpdir(), 'pl-pg-'));
const storageDir = mkdtempSync(join(tmpdir(), 'pl-store-'));
const pg = new EmbeddedPostgres({ databaseDir: dataDir, user: 'postgres', password: 'postgres', port: PG_PORT, persistent: false });
let server;
let n = 0;
const ok = (m) => console.log('  ✓', m, (n++, ''));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');

async function call(method, path, { token, form, json } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (json) headers['Content-Type'] = 'application/json';
  const res = await fetch(BASE + path, { method, headers, body: form || (json && JSON.stringify(json)), redirect: 'manual' });
  const type = res.headers.get('content-type') || '';
  const data = type.includes('json') ? await res.json() : Buffer.from(await res.arrayBuffer());
  return { status: res.status, data, headers: res.headers };
}
const fd = (o, logo) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(o)) f.append(k, v);
  if (logo) f.append('logo', new Blob([logo.buf], { type: logo.type }), logo.name);
  return f;
};

let failed = false;
try {
  await pg.initialise(); await pg.start(); await pg.createDatabase('reading');
  const DATABASE_URL = `postgresql://postgres:postgres@127.0.0.1:${PG_PORT}/reading`;
  execSync('npx prisma migrate deploy', { stdio: 'pipe', env: { ...process.env, DATABASE_URL } });
  server = spawn('node', ['dist/main.js'], {
    env: { ...process.env, DATABASE_URL, PORT: String(API_PORT), JWT_SECRET: 'test-secret-test-secret-123', FRONTEND_URL: 'http://localhost:5173', ADMIN_EMAIL: 'admin@test.dev', ADMIN_PASSWORD: 'AdminPass123', STORAGE_LOCAL_DIR: storageDir, CLOUDINARY_URL: '', CLOUDINARY_CLOUD_NAME: '', CLOUDINARY_API_KEY: '', CLOUDINARY_API_SECRET: '', STORAGE_BUCKET: '', MENTORSHIP_TEST_MODE: 'false', NODE_ENV: 'development' },
    stdio: 'ignore',
  });
  for (let i = 0; i < 60; i++) { try { if ((await fetch(BASE + '/health')).ok) break; } catch {} await sleep(300); }

  const ADMIN = (await call('POST', '/auth/login', { json: { email: 'admin@test.dev', password: 'AdminPass123' } })).data.token;
  const USER = (await call('POST', '/auth/register', { json: { name: 'Rahul', email: 'u@test.dev', password: 'password123' } })).data.token;

  console.log('Public list + admin protection');
  assert.deepEqual((await call('GET', '/platforms')).data, []);
  ok('public list starts empty (no login needed)');
  assert.equal((await call('GET', '/admin/platforms')).status, 401);
  assert.equal((await call('GET', '/admin/platforms', { token: USER })).status, 403);
  assert.equal((await call('POST', '/admin/platforms', { token: USER, form: fd({ name: 'X', referralUrl: 'https://x.example/r' }) })).status, 403);
  ok('admin platform APIs: 401 without a token, 403 for a normal user');

  console.log('Validation (only safe https URLs)');
  const badCreate = async (o, label) => assert.equal((await call('POST', '/admin/platforms', { token: ADMIN, form: fd(o) })).status, 400, label);
  await badCreate({ name: 'A', referralUrl: 'javascript:alert(1)' }, 'javascript: url');
  await badCreate({ name: 'A', referralUrl: 'http://broker.example/r?ref=1' }, 'plain http');
  await badCreate({ name: 'A', referralUrl: 'data:text/html,<script>1</script>' }, 'data: url');
  await badCreate({ name: 'A', referralUrl: 'https://user:pass@broker.example/r' }, 'credentials in url');
  await badCreate({ name: 'A', referralUrl: 'not a url' }, 'garbage');
  await badCreate({ name: 'A' }, 'no way to sign up');
  await badCreate({ name: 'A', referralCode: 'ABC' }, 'code without a registration page');
  await badCreate({ name: '', referralUrl: 'https://broker.example/r' }, 'no name');
  await badCreate({ name: 'A', referralUrl: 'https://broker.example/r', slug: 'Bad Slug!' }, 'bad slug');
  await badCreate({ name: 'A', referralUrl: 'https://broker.example/r', logoUrl: 'javascript:alert(1)' }, 'bad logo url');
  ok('javascript:, data:, http:, user:pass@, garbage URLs, missing name/link, bad slug/logo URL all rejected');

  console.log('Exact referral URL + redirect');
  const EXACT = 'https://www.exness-partner.example/register?aff_id=CLIENT_42&utm_source=tp&x=a%20b#top';
  const p1 = (await call('POST', '/admin/platforms', { token: ADMIN, form: fd({ name: 'Exness Test', category: 'Broker', description: 'A broker.', referralUrl: EXACT, featured: 'true', sortOrder: '1', ctaLabel: 'Sign Up' }) })).data;
  assert.equal(p1.slug, 'exness-test');
  assert.equal(p1.referralUrl, EXACT, 'stored exactly as supplied (no rebuilt/normalised parameters)');
  const go1 = await call('GET', '/go/exness-test');
  assert.equal(go1.status, 302);
  assert.equal(go1.headers.get('location'), EXACT);
  assert.match(go1.headers.get('cache-control'), /no-store/);
  ok('referral URL stored byte-for-byte; /go/:slug answers 302 to exactly that URL');

  const p2 = (await call('POST', '/admin/platforms', { token: ADMIN, form: fd({ name: 'Exness Test', referralUrl: 'https://other.example/join?partner=7', sortOrder: '2', category: 'Prop Firm' }) })).data;
  assert.equal(p2.slug, 'exness-test-2');
  assert.equal((await call('GET', '/go/exness-test-2')).headers.get('location'), 'https://other.example/join?partner=7');
  ok('duplicate names get a unique slug; each redirects to its own URL (different referral formats work)');

  const p3 = (await call('POST', '/admin/platforms', { token: ADMIN, form: fd({ name: 'Code Only', referralCode: 'MYCODE42', websiteUrl: 'https://codeonly.example/signup', sortOrder: '3' }) })).data;
  assert.equal(p3.referralUrl, null);
  assert.equal((await call('GET', '/go/code-only')).headers.get('location'), 'https://codeonly.example/signup');
  ok('code-only platform: needs a registration page; /go opens it (the code is shown on the card with a copy button, never auto-filled)');

  assert.equal((await call('GET', '/go/does-not-exist')).status, 404);
  ok('unknown slug -> 404 (no open redirect)');

  console.log('Click counting');
  await call('GET', '/go/exness-test'); await call('GET', '/go/exness-test');
  await sleep(500);
  const list = (await call('GET', '/admin/platforms', { token: ADMIN })).data;
  const c1 = list.find((p) => p.slug === 'exness-test');
  assert.equal(c1.clicks, 3);
  assert.ok(c1.lastClickAt);
  ok('each click is counted (3 clicks), with a last-click time; nothing personal is stored');

  console.log('Public card data');
  const pub = (await call('GET', '/platforms')).data;
  assert.deepEqual(pub.map((p) => p.slug), ['exness-test', 'exness-test-2', 'code-only']);
  assert.ok(pub.every((p) => !('referralUrl' in p) && !('clicks' in p) && !('logoKey' in p)), 'no referral url / stats / storage keys in the public list');
  assert.deepEqual([pub[0].featured, pub[0].category, pub[0].ctaLabel, pub[0].canSignUp, pub[0].hasReferralUrl], [true, 'Broker', 'Sign Up', true, true]);
  assert.deepEqual([pub[2].referralCode, pub[2].hasReferralUrl, pub[2].canSignUp], ['MYCODE42', false, true]);
  ok('public list is ordered by sortOrder and exposes only card data (no referral URL, stats or storage keys)');

  console.log('Logo upload');
  const withLogo = (await call('PATCH', `/admin/platforms/${p1.id}`, { token: ADMIN, form: fd({}, { buf: PNG, type: 'image/png', name: 'logo.png' }) })).data;
  assert.ok(withLogo.logoKey);
  const pubLogo = (await call('GET', '/platforms')).data[0].logo;
  assert.match(pubLogo, /^\/platforms\/exness-test\/logo\?v=\d+$/);
  const logoRes = await call('GET', pubLogo);
  assert.equal(logoRes.status, 200);
  assert.equal(logoRes.headers.get('content-type'), 'image/png');
  assert.match(logoRes.headers.get('cache-control'), /public/);
  ok('uploaded logo is served publicly at /platforms/:slug/logo (png, cacheable)');
  assert.equal((await call('PATCH', `/admin/platforms/${p1.id}`, { token: ADMIN, form: fd({}, { buf: Buffer.from('not an image'), type: 'image/png', name: 'x.png' }) })).status, 400);
  assert.equal((await call('PATCH', `/admin/platforms/${p1.id}`, { token: ADMIN, form: fd({}, { buf: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>1</script></svg>'), type: 'image/svg+xml', name: 'x.svg' }) })).status, 400);
  assert.equal((await call('PATCH', `/admin/platforms/${p1.id}`, { token: ADMIN, form: fd({}, { buf: Buffer.alloc(1100 * 1024, 1), type: 'image/png', name: 'big.png' }) })).status, 413);
  ok('fake images, SVG uploads and files over 1MB are refused');
  const viaUrl = (await call('PATCH', `/admin/platforms/${p2.id}`, { token: ADMIN, form: fd({ logoUrl: 'https://cdn.example/logo.svg' }) })).data;
  assert.equal((await call('GET', '/platforms')).data[1].logo, 'https://cdn.example/logo.svg');
  ok('a logo URL (https) also works');

  console.log('Editing');
  assert.equal((await call('PATCH', `/admin/platforms/${p1.id}`, { token: ADMIN, form: fd({ referralUrl: 'http://insecure.example/r' }) })).status, 400);
  assert.equal((await call('PATCH', `/admin/platforms/${p3.id}`, { token: ADMIN, form: fd({ websiteUrl: '' }) })).status, 400);
  const upd = (await call('PATCH', `/admin/platforms/${p1.id}`, { token: ADMIN, form: fd({ referralUrl: 'https://new.example/ref?code=Z9', featured: 'false', removeLogo: 'true' }) })).data;
  assert.deepEqual([upd.referralUrl, upd.featured, upd.logoKey], ['https://new.example/ref?code=Z9', false, null]);
  assert.equal((await call('GET', '/go/exness-test')).headers.get('location'), 'https://new.example/ref?code=Z9');
  ok('edits are validated too; changing the referral URL takes effect immediately, no code change needed');

  await call('PATCH', `/admin/platforms/${p2.id}`, { token: ADMIN, form: fd({ isActive: 'false' }) });
  assert.equal((await call('GET', '/go/exness-test-2')).status, 404);
  assert.ok(!(await call('GET', '/platforms')).data.some((p) => p.slug === 'exness-test-2'));
  ok('hidden platforms disappear from the site and their /go link stops working');

  assert.equal((await call('DELETE', `/admin/platforms/${p3.id}`, { token: ADMIN })).data.deleted, true);
  assert.equal((await call('GET', '/go/code-only')).status, 404);
  ok('delete removes the platform');

  console.log(`\nAll ${n} checks passed.`);
} catch (e) {
  failed = true;
  console.error('\nFAILED:', e);
} finally {
  try { server?.kill(); } catch {}
  await pg.stop().catch(() => {});
  rmSync(dataDir, { recursive: true, force: true });
  rmSync(storageDir, { recursive: true, force: true });
  process.exit(failed ? 1 : 0);
}

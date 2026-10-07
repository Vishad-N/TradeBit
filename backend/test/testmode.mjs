// Verifies MENTORSHIP_TEST_MODE: off by default, works in development, and is refused in production.
// Run: npm run build && node test/testmode.mjs
import { spawn, execSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import assert from 'node:assert/strict';
import EmbeddedPostgres from 'embedded-postgres';

const PG_PORT = 54339;
const dataDir = mkdtempSync(join(tmpdir(), 'tm-pg-'));
const storageDir = mkdtempSync(join(tmpdir(), 'tm-store-'));
const pg = new EmbeddedPostgres({ databaseDir: dataDir, user: 'postgres', password: 'postgres', port: PG_PORT, persistent: false });
const DATABASE_URL = `postgresql://postgres:postgres@127.0.0.1:${PG_PORT}/reading`;
const servers = [];
let n = 0;
const ok = (m) => console.log('  ✓', m, (n++, ''));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function start(port, extra) {
  const child = spawn('node', ['dist/main.js'], {
    env: { ...process.env, DATABASE_URL, PORT: String(port), JWT_SECRET: 'test-secret-test-secret-123', FRONTEND_URL: 'http://localhost:5173', CLOUDINARY_URL: '', CLOUDINARY_CLOUD_NAME: '', CLOUDINARY_API_KEY: '', CLOUDINARY_API_SECRET: '', STORAGE_BUCKET: '', MENTORSHIP_TEST_MODE: 'false', STORAGE_LOCAL_DIR: storageDir, PAYMENT_RATE_LIMIT_PER_MIN: '500', ...extra },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let logs = '';
  child.stdout.on('data', (d) => (logs += d));
  child.stderr.on('data', (d) => (logs += d));
  servers.push(child);
  for (let i = 0; i < 60; i++) { try { if ((await fetch(`http://127.0.0.1:${port}/api/v1/health`)).ok) break; } catch {} await sleep(300); }
  return { base: `http://127.0.0.1:${port}/api/v1`, logs: () => logs };
}
const call = async (base, method, path, token) => {
  const r = await fetch(base + path, { method, headers: token ? { Authorization: `Bearer ${token}` } : {} });
  return { status: r.status, data: await r.json().catch(() => null) };
};
const register = async (base, email) => (await (await fetch(base + '/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'Test User', email, password: 'password123' }) })).json()).token;

let failed = false;
try {
  await pg.initialise(); await pg.start(); await pg.createDatabase('reading');
  execSync('npx prisma migrate deploy', { stdio: 'pipe', env: { ...process.env, DATABASE_URL } });

  console.log('Test mode OFF (default)');
  const off = await start(3981, { NODE_ENV: 'development' });
  const tOff = await register(off.base, 'off@test.dev');
  assert.equal((await call(off.base, 'GET', '/mentorship/payment-info', tOff)).data.testMode, false);
  assert.equal((await call(off.base, 'POST', '/mentorship/test-activate', tOff)).status, 404);
  assert.equal((await call(off.base, 'GET', '/mentorship/status', tOff)).data.state, 'NOT_STARTED');
  ok('flag unset: testMode=false and test-activate is 404; user stays NOT_STARTED');

  console.log('Test mode ON (development)');
  const on = await start(3982, { NODE_ENV: 'development', MENTORSHIP_TEST_MODE: 'true', TELEGRAM_URL: 'https://t.me/test_mentor' });
  assert.match(on.logs(), /TEST MODE is ON/);
  const tOn = await register(on.base, 'on@test.dev');
  assert.equal((await call(on.base, 'POST', '/mentorship/test-activate')).status, 401);
  assert.equal((await call(on.base, 'GET', '/mentorship/payment-info', tOn)).data.testMode, true);
  const act = await call(on.base, 'POST', '/mentorship/test-activate', tOn);
  assert.equal(act.status, 201);
  assert.deepEqual([act.data.state, act.data.telegramUrl], ['APPROVED', 'https://t.me/test_mentor']);
  assert.equal((await call(on.base, 'GET', '/mentorship/status', tOn)).data.state, 'APPROVED');
  ok('flag on: login required, activates without payment, status APPROVED + Telegram link');

  console.log('Test mode in PRODUCTION is refused');
  const prod = await start(3983, { NODE_ENV: 'production', MENTORSHIP_TEST_MODE: 'true' });
  assert.match(prod.logs(), /test mode is IGNORED/i);
  const tProd = await register(prod.base, 'prod@test.dev');
  assert.equal((await call(prod.base, 'GET', '/mentorship/payment-info', tProd)).data.testMode, false);
  assert.equal((await call(prod.base, 'POST', '/mentorship/test-activate', tProd)).status, 404);
  ok('NODE_ENV=production + flag: ignored, logged as an error, test-activate is 404');

  console.log(`\nAll ${n} checks passed.`);
} catch (e) {
  failed = true;
  console.error('\nFAILED:', e);
} finally {
  servers.forEach((s) => { try { s.kill(); } catch {} });
  await pg.stop().catch(() => {});
  rmSync(dataDir, { recursive: true, force: true });
  rmSync(storageDir, { recursive: true, force: true });
  process.exit(failed ? 1 : 0);
}

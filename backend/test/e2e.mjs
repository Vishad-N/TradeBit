// End-to-end test of the reading API against a real (embedded) Postgres and the built app.
// Run: npm run build && npm run test:e2e
import { spawn, execSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import assert from 'node:assert/strict';
import EmbeddedPostgres from 'embedded-postgres';

const PG_PORT = 54329;
const API_PORT = 3999;
const BASE = `http://127.0.0.1:${API_PORT}/api/v1`;
const dataDir = mkdtempSync(join(tmpdir(), 'rd-pg-'));
const storageDir = mkdtempSync(join(tmpdir(), 'rd-store-'));

const pg = new EmbeddedPostgres({ databaseDir: dataDir, user: 'postgres', password: 'postgres', port: PG_PORT, persistent: false });
let server;
let passed = 0;
const ok = (name) => console.log(`  ✓ ${name}`, (passed++, ''));

/** Minimal multi-page PDF with a big page number on each page. */
function makePdf(pages) {
  const objs = [];
  const add = (s) => objs.push(s) && objs.length;
  add('<< /Type /Catalog /Pages 2 0 R >>');
  add(`<< /Type /Pages /Kids [${Array.from({ length: pages }, (_, i) => `${4 + i * 2} 0 R`).join(' ')}] /Count ${pages} >>`);
  add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  for (let i = 0; i < pages; i++) {
    add(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 400 560] /Contents ${5 + i * 2} 0 R /Resources << /Font << /F1 3 0 R >> >> >>`);
    const text = `BT /F1 90 Tf 120 260 Td (${i + 1}) Tj ET`;
    add(`<< /Length ${text.length} >>\nstream\n${text}\nendstream`);
  }
  let out = '%PDF-1.4\n';
  const offsets = [];
  objs.forEach((o, i) => {
    offsets.push(out.length);
    out += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const xref = out.length;
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${offsets.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('')}`;
  out += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(out, 'latin1');
}

async function call(method, path, { token, body, form, headers = {} } = {}) {
  const h = { ...headers };
  if (token) h.Authorization = `Bearer ${token}`;
  let payload;
  if (form) payload = form;
  else if (body !== undefined) {
    h['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }
  const res = await fetch(BASE + path, { method, headers: h, body: payload });
  const type = res.headers.get('content-type') || '';
  const data = type.includes('json') ? await res.json() : Buffer.from(await res.arrayBuffer());
  return { status: res.status, data, headers: res.headers };
}

async function waitFor(fn, label, ms = 30000) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    const v = await fn();
    if (v) return v;
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error(`timeout: ${label}`);
}

async function main() {
  await pg.initialise();
  await pg.start();
  await pg.createDatabase('reading');
  const DATABASE_URL = `postgresql://postgres:postgres@127.0.0.1:${PG_PORT}/reading`;
  execSync('npx prisma migrate deploy', { stdio: 'pipe', env: { ...process.env, DATABASE_URL } });

  server = spawn('node', ['dist/main.js'], {
    env: { ...process.env, DATABASE_URL, PORT: String(API_PORT), JWT_SECRET: 'test-secret-test-secret-123', FRONTEND_URL: 'http://localhost:5173', ADMIN_EMAIL: 'admin@test.dev', ADMIN_PASSWORD: 'AdminPass123', CLOUDINARY_URL: '', CLOUDINARY_CLOUD_NAME: '', CLOUDINARY_API_KEY: '', CLOUDINARY_API_SECRET: '', STORAGE_BUCKET: '', MENTORSHIP_TEST_MODE: 'false', NODE_ENV: 'development', STORAGE_LOCAL_DIR: storageDir, MENTORSHIP_PRICE_USDT: '150', MENTORSHIP_WALLET_ADDRESS: 'TQn9Y2khEsLJW1ChVWFMSMeRDow5KcbLSE', TELEGRAM_URL: 'https://t.me/test_mentor', PAYMENT_RATE_LIMIT_PER_MIN: '500' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let logs = '';
  server.stdout.on('data', (d) => (logs += d));
  server.stderr.on('data', (d) => (logs += d));
  await waitFor(async () => (await fetch(BASE + '/health').then((r) => r.ok).catch(() => false)), 'api up');

  console.log('Health / auth');
  const health = await call('GET', '/health');
  assert.equal(health.data.db, 'up');
  ok('health endpoint reports db up');

  assert.equal((await call('GET', '/reading/me/status')).status, 401);
  ok('logged-out: status requires login (401)');

  const regA = await call('POST', '/auth/register', { body: { name: 'Rahul Sharma', email: 'rahul@test.dev', password: 'password123' } });
  assert.equal(regA.status, 201);
  const A = regA.data.token;
  const B = (await call('POST', '/auth/register', { body: { name: 'Priya Rao', email: 'priya@test.dev', password: 'password123' } })).data.token;
  const C = (await call('POST', '/auth/register', { body: { name: 'Amit Das', email: 'amit@test.dev', password: 'password123' } })).data.token;
  assert.equal((await call('POST', '/auth/register', { body: { name: 'Rahul Again', email: 'rahul@test.dev', password: 'password123' } })).status, 409);
  ok('register works, duplicate email rejected');

  assert.equal((await call('POST', '/auth/register', { body: { name: 'Eve', email: 'eve@test.dev', password: 'password123', role: 'ADMIN' } })).status, 400);
  ok('client cannot send a role at sign-up');

  assert.equal((await call('POST', '/auth/login', { body: { email: 'rahul@test.dev', password: 'wrong-password' } })).status, 401);
  const login = await call('POST', '/auth/login', { body: { email: 'admin@test.dev', password: 'AdminPass123' } });
  assert.equal(login.data.user.role, 'ADMIN');
  const ADMIN = login.data.token;
  ok('login ok, bad password 401, seeded admin has ADMIN role');

  console.log('Admin authorisation');
  assert.equal((await call('GET', '/admin/books', { token: A })).status, 403);
  assert.equal((await call('GET', '/admin/reading/requests', { token: A })).status, 403);
  assert.equal((await call('POST', '/admin/tasks', { token: A, body: { bookId: 'x', title: 't', description: 'd' } })).status, 403);
  assert.equal((await call('GET', '/admin/books')).status, 401);
  ok('normal user gets 403 (no token 401) on admin APIs');

  console.log('Book upload + processing');
  const noTaskStatus = await call('GET', '/reading/me/status', { token: A });
  assert.equal(noTaskStatus.data.state, 'NO_ACTIVE_TASK');
  ok('no task yet -> NO_ACTIVE_TASK');

  const badForm = new FormData();
  badForm.append('title', 'Fake');
  badForm.append('file', new Blob([Buffer.from('this is not a pdf')], { type: 'application/pdf' }), 'fake.pdf');
  assert.equal((await call('POST', '/admin/books', { token: ADMIN, form: badForm })).status, 400);
  ok('non-PDF content with a .pdf name is rejected (signature check)');

  const form = new FormData();
  form.append('title', 'Advanced Trading');
  form.append('description', 'A test book');
  form.append('file', new Blob([makePdf(5)], { type: 'application/pdf' }), 'book.pdf');
  const created = await call('POST', '/admin/books', { token: ADMIN, form });
  assert.equal(created.status, 201);
  assert.ok(!('originalFilePath' in created.data), 'originalFilePath must not be exposed');
  const bookId = created.data.id;
  const ready = await waitFor(async () => {
    const list = (await call('GET', '/admin/books', { token: ADMIN })).data;
    const b = list.find((x) => x.id === bookId);
    return b.status === 'READY' ? b : b.status === 'FAILED' ? Promise.reject(new Error('processing failed: ' + b.processingError)) : null;
  }, 'book ready');
  assert.equal(ready.pageCount, 5);
  assert.ok(!JSON.stringify(ready).includes('originalFilePath'));
  ok('PDF processed into 5 pages, status READY, storage path not exposed');

  console.log('Global task + per-user submissions');
  const task = (await call('POST', '/admin/tasks', { token: ADMIN, body: { bookId, title: 'Complete the Chapter 1 Reading Activity', description: 'Read the instructions and complete the activity.' } })).data;
  const sA = (await call('GET', '/reading/me/status', { token: A })).data;
  const sB = (await call('GET', '/reading/me/status', { token: B })).data;
  assert.equal(sA.state, 'NOT_SUBMITTED');
  assert.equal(sA.task.id, task.id);
  assert.equal(sB.task.id, task.id);
  ok('every user sees the same global task (title/description from DB)');

  assert.equal((await call('GET', `/reading/books/${bookId}/pages/1`, { token: A, headers: { 'X-Reading-Session': 'x' } })).status, 403);
  assert.equal((await call('POST', `/reading/books/${bookId}/session`, { token: A })).status, 403);
  assert.equal((await call('GET', `/reading/progress/${bookId}`, { token: A })).status, 403);
  ok('not approved -> pages / session / progress all 403');

  const sub1 = await call('POST', `/reading/tasks/${task.id}/submit`, { token: A, body: { userId: 'someone-else' } });
  assert.equal(sub1.status, 201);
  assert.equal(sub1.data.state, 'PENDING_REVIEW'); // the body is ignored; the row belongs to the token's user
  const subA = await call('POST', `/reading/tasks/${task.id}/submit`, { token: A });
  assert.equal(subA.data.state, 'PENDING_REVIEW');
  const subA2 = await call('POST', `/reading/tasks/${task.id}/submit`, { token: A });
  assert.equal(subA2.data.state, 'PENDING_REVIEW');
  assert.equal((await call('POST', `/reading/tasks/${task.id}/submit`, { token: B })).data.state, 'PENDING_REVIEW');
  assert.equal((await call('POST', `/reading/tasks/${task.id}/submit`, { token: C })).data.state, 'PENDING_REVIEW');
  assert.equal((await call('POST', `/reading/tasks/nope/submit`, { token: A })).status, 404);
  ok('submit -> PENDING_REVIEW, duplicate submit is idempotent, userId in the body ignored (row belongs to the token user), unknown task 404');

  const reqs = (await call('GET', '/admin/reading/requests', { token: ADMIN })).data;
  assert.equal(reqs.length, 3, 'one row per user (unique taskId+userId)');
  const reqOf = (email) => reqs.find((r) => r.user.email === email);
  ok('admin sees 3 independent requests');

  console.log('Approve / reject');
  assert.equal((await call('PATCH', `/admin/reading/requests/${reqOf('rahul@test.dev').id}/approve`, { token: B })).status, 403);
  ok('normal user cannot approve');

  assert.equal((await call('PATCH', `/admin/reading/requests/${reqOf('rahul@test.dev').id}/approve`, { token: ADMIN })).data.status, 'APPROVED');
  assert.equal((await call('PATCH', `/admin/reading/requests/${reqOf('amit@test.dev').id}/reject`, { token: ADMIN, body: { reason: 'Please complete the activity again.' } })).data.status, 'REJECTED');
  assert.equal((await call('GET', '/reading/me/status', { token: A })).data.state, 'ACCESS_ACTIVE');
  assert.equal((await call('GET', '/reading/me/status', { token: B })).data.state, 'PENDING_REVIEW');
  const sC = (await call('GET', '/reading/me/status', { token: C })).data;
  assert.equal(sC.state, 'REJECTED');
  assert.equal(sC.rejectionReason, 'Please complete the activity again.');
  ok('A approved, B still pending, C rejected with reason (independent per user)');

  console.log('Protected reader');
  assert.equal((await call('GET', `/reading/books/${bookId}/pages/1`, { token: B, headers: { 'X-Reading-Session': 'x' } })).status, 403);
  ok("user B (pending) cannot read A's book");

  const sess = (await call('POST', `/reading/books/${bookId}/session`, { token: A })).data;
  assert.equal(sess.pageCount, 5);
  assert.match(sess.watermark, /Rahul Sharma • Access #/);
  ok(`session started, watermark "${sess.watermark}"`);

  const page = await call('GET', `/reading/books/${bookId}/pages/3`, { token: A, headers: { 'X-Reading-Session': sess.sessionToken } });
  assert.equal(page.status, 200);
  assert.equal(page.headers.get('content-type'), 'image/jpeg');
  assert.equal(page.data[0], 0xff);
  assert.equal(page.data[1], 0xd8);
  assert.match(page.headers.get('cache-control'), /no-store/);
  ok(`page 3 served as a JPEG (${page.data.length} bytes), Cache-Control no-store`);

  assert.equal((await call('GET', `/reading/books/${bookId}/pages/0`, { token: A, headers: { 'X-Reading-Session': sess.sessionToken } })).status, 404);
  assert.equal((await call('GET', `/reading/books/${bookId}/pages/6`, { token: A, headers: { 'X-Reading-Session': sess.sessionToken } })).status, 404);
  assert.equal((await call('GET', `/reading/books/${bookId}/pages/abc`, { token: A, headers: { 'X-Reading-Session': sess.sessionToken } })).status, 400);
  assert.equal((await call('GET', `/reading/books/not-a-book/pages/1`, { token: A, headers: { 'X-Reading-Session': sess.sessionToken } })).status, 404);
  ok('page 0 / 6 -> 404, "abc" -> 400, unknown book -> 404');

  assert.equal((await call('GET', `/reading/books/${bookId}/pages/1`, { token: A })).status, 409);
  const sess2 = (await call('POST', `/reading/books/${bookId}/session`, { token: A })).data;
  const old = await call('GET', `/reading/books/${bookId}/pages/1`, { token: A, headers: { 'X-Reading-Session': sess.sessionToken } });
  assert.equal(old.status, 409);
  assert.equal(old.data.code, 'SESSION_REPLACED');
  assert.equal((await call('GET', `/reading/books/${bookId}/pages/1`, { token: A, headers: { 'X-Reading-Session': sess2.sessionToken } })).status, 200);
  ok('second session replaces the first (old one gets 409 SESSION_REPLACED)');

  console.log('Progress');
  assert.equal((await call('PATCH', `/reading/progress/${bookId}`, { token: A, body: { currentPage: 4 } })).data.progressPercentage, 80);
  assert.equal((await call('PATCH', `/reading/progress/${bookId}`, { token: A, body: { currentPage: 999 } })).data.currentPage, 5);
  assert.equal((await call('PATCH', `/reading/progress/${bookId}`, { token: A, body: { currentPage: 4 } })).data.currentPage, 4);
  const resume = (await call('POST', `/reading/books/${bookId}/session`, { token: A })).data;
  assert.equal(resume.currentPage, 4);
  assert.equal((await call('GET', '/reading/me/status', { token: A })).data.currentPage, 4);
  assert.equal((await call('PATCH', `/reading/progress/${bookId}`, { token: B, body: { currentPage: 2 } })).status, 403);
  ok('progress saved, clamped to page count, resumes at page 4; other user cannot write it');

  console.log('Rejected user can resubmit; revoke on reject');
  assert.equal((await call('POST', `/reading/tasks/${task.id}/submit`, { token: C })).data.state, 'PENDING_REVIEW');
  ok('rejected user resubmits -> PENDING_REVIEW again');
  assert.equal((await call('PATCH', `/admin/reading/requests/${reqOf('rahul@test.dev').id}/reject`, { token: ADMIN, body: {} })).data.status, 'REJECTED');
  assert.equal((await call('GET', '/reading/me/status', { token: A })).data.state, 'ACCESS_REVOKED');
  assert.equal((await call('GET', `/reading/books/${bookId}/pages/1`, { token: A, headers: { 'X-Reading-Session': resume.sessionToken } })).status, 403);
  ok('rejecting an approved request revokes access immediately (page API 403)');

  console.log('Task replacement keeps history');
  const task2 = (await call('POST', '/admin/tasks', { token: ADMIN, body: { bookId, title: 'Chapter 2 task', description: 'New task' } })).data;
  const tasks = (await call('GET', '/admin/tasks', { token: ADMIN })).data;
  assert.equal(tasks.filter((t) => t.isActive).length, 1);
  assert.equal((await call('GET', '/reading/tasks/current', { token: B })).data.id, task2.id);
  assert.equal((await call('GET', '/admin/reading/requests', { token: ADMIN })).data.length, 3);
  ok('only one active task; old submissions are kept');

  console.log('1:1 mentorship payment flow');
  const D = (await call('POST', '/auth/register', { body: { name: 'Dev Patel', email: 'dev@test.dev', password: 'password123' } })).data.token;
  const E = (await call('POST', '/auth/register', { body: { name: 'Esha Roy', email: 'esha@test.dev', password: 'password123' } })).data.token;
  const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
  const hash = (c) => c.repeat(64);
  const today = new Date().toISOString().slice(0, 10);
  const payForm = (o = {}) => {
    const f = new FormData();
    f.append('amountPaid', o.amountPaid ?? '150');
    f.append('txHash', o.txHash ?? hash('a'));
    f.append('paymentDate', o.paymentDate ?? today);
    if (o.file !== null) f.append('screenshot', new Blob([o.file ?? PNG], { type: 'image/png' }), 'shot.png');
    return f;
  };

  assert.equal((await call('GET', '/mentorship/payment-info')).status, 401);
  assert.equal((await call('POST', '/mentorship/payments', { form: payForm() })).status, 401);
  const info = (await call('GET', '/mentorship/payment-info', { token: D })).data;
  assert.deepEqual([info.priceUsdt, info.network, info.configured], ['150', 'TRC20', true]);
  assert.equal(info.walletAddress, 'TQn9Y2khEsLJW1ChVWFMSMeRDow5KcbLSE');
  assert.equal((await call('GET', '/mentorship/status', { token: D })).data.state, 'NOT_STARTED');
  ok('payment info comes from the server (USDT / TRC20 / wallet); login required; starts NOT_STARTED');

  const bad = async (o, label) => assert.equal((await call('POST', '/mentorship/payments', { token: D, form: payForm(o) })).status, 400, label);
  await bad({ txHash: 'not-a-hash' }, 'bad tx hash');
  await bad({ txHash: 'z'.repeat(64) }, 'non-hex tx hash');
  await bad({ amountPaid: '-5' }, 'negative amount');
  await bad({ amountPaid: 'abc' }, 'non numeric amount');
  await bad({ paymentDate: 'garbage' }, 'bad date');
  await bad({ paymentDate: new Date(Date.now() + 5 * 86400000).toISOString() }, 'future date');
  await bad({ paymentDate: new Date(Date.now() - 200 * 86400000).toISOString() }, 'very old date');
  await bad({ file: null }, 'missing screenshot');
  await bad({ file: Buffer.from('this is not an image at all, just text') }, 'non-image screenshot');
  ok('submission validation: bad hash/amount/date, missing or fake (non-image) screenshot all rejected');

  const sub = await call('POST', '/mentorship/payments', { token: D, form: payForm() });
  assert.equal(sub.status, 201);
  assert.equal(sub.data.state, 'PENDING');
  assert.ok(!('telegramUrl' in sub.data), 'no telegram link while pending');
  assert.ok(!JSON.stringify(sub.data).includes('screenshotKey'));
  assert.equal((await call('POST', '/mentorship/payments', { token: D, form: payForm({ txHash: hash('b') }) })).status, 409);
  assert.equal((await call('POST', '/mentorship/payments', { token: E, form: payForm() })).status, 409);
  ok('submit -> PENDING (no telegram link yet); second pending blocked; same tx hash by another user blocked');

  const stPending = (await call('GET', '/reading/me/status', { token: D })).data;
  assert.deepEqual([stPending.state, stPending.mentorshipPayment], ['NOT_SUBMITTED', 'PENDING']);
  assert.equal((await call('GET', `/reading/books/${bookId}`, { token: D })).status, 403);
  assert.equal((await call('GET', '/admin/mentorship/payments', { token: D })).status, 403);
  assert.equal((await call('GET', '/admin/mentorship/payments')).status, 401);
  ok('pending user: book still locked (403), admin payment APIs forbidden');

  const list = (await call('GET', '/admin/mentorship/payments?status=PENDING', { token: ADMIN })).data;
  assert.equal(list.length, 1);
  const pay = list[0];
  assert.deepEqual([pay.user.email, pay.amountPaid, pay.network, pay.txHash, pay.status], ['dev@test.dev', '150', 'TRC20', hash('a'), 'PENDING']);
  assert.ok(!JSON.stringify(pay).includes('screenshotKey'));
  const shot = await call('GET', `/admin/mentorship/payments/${pay.id}/screenshot`, { token: ADMIN });
  assert.equal(shot.status, 200);
  assert.equal(shot.headers.get('content-type'), 'image/png');
  assert.equal((await call('GET', `/admin/mentorship/payments/${pay.id}/screenshot`, { token: D })).status, 403);
  ok('admin sees user, amount, network, tx hash, date and the screenshot; non-admin cannot');

  assert.equal((await call('PATCH', `/admin/mentorship/payments/${pay.id}/approve`, { token: D })).status, 403);
  const rejected = (await call('PATCH', `/admin/mentorship/payments/${pay.id}/reject`, { token: ADMIN, body: { reason: 'Amount does not match.' } })).data;
  assert.equal(rejected.status, 'REJECTED');
  const sD = (await call('GET', '/mentorship/status', { token: D })).data;
  assert.deepEqual([sD.state, sD.rejectionReason], ['REJECTED', 'Amount does not match.']);
  assert.equal((await call('GET', `/reading/books/${bookId}`, { token: D })).status, 403);
  ok('reject with a reason -> user sees REJECTED + reason; book still locked');

  const re = await call('POST', '/mentorship/payments', { token: D, form: payForm({ txHash: hash('a') }) });
  assert.equal(re.data.state, 'PENDING');
  assert.equal((await call('GET', '/admin/mentorship/payments', { token: ADMIN })).data.length, 1, 'same rejected row reused');
  ok('user can resubmit after rejection (same row reused, no duplicate)');

  const approved = (await call('PATCH', `/admin/mentorship/payments/${pay.id}/approve`, { token: ADMIN })).data;
  assert.equal(approved.status, 'APPROVED');
  const sD2 = (await call('GET', '/mentorship/status', { token: D })).data;
  assert.deepEqual([sD2.state, sD2.telegramUrl], ['APPROVED', 'https://t.me/test_mentor']);
  assert.equal((await call('GET', '/mentorship/status', { token: E })).data.telegramUrl, undefined);
  ok('approve -> APPROVED + Telegram link, only for the approved user');

  const sBook = (await call('GET', '/reading/me/status', { token: D })).data;
  assert.equal(sBook.state, 'ACCESS_ACTIVE');
  assert.equal(sBook.book.id, bookId);
  const dSess = (await call('POST', `/reading/books/${bookId}/session`, { token: D })).data;
  assert.equal((await call('GET', `/reading/books/${bookId}/pages/1`, { token: D, headers: { 'X-Reading-Session': dSess.sessionToken } })).status, 200);
  assert.equal((await call('GET', `/reading/books/${bookId}`, { token: E })).status, 403);
  ok('approved mentorship unlocks the protected book (no reading task needed); others stay locked');

  assert.equal((await call('POST', '/mentorship/payments', { token: D, form: payForm({ txHash: hash('c') }) })).status, 409);
  ok('approved user cannot submit another payment');

  await call('PATCH', `/admin/mentorship/payments/${pay.id}/reject`, { token: ADMIN, body: {} });
  assert.equal((await call('GET', '/mentorship/status', { token: D })).data.state, 'REJECTED');
  assert.equal((await call('GET', `/reading/books/${bookId}`, { token: D })).status, 403);
  ok('withdrawing the approval revokes mentorship + the book access it granted');

  console.log('Admin book lifecycle / unavailable');
  await call('PATCH', `/admin/reading/requests/${reqOf('rahul@test.dev').id}/approve`, { token: ADMIN });
  const s3 = (await call('POST', `/reading/books/${bookId}/session`, { token: A })).data;
  await call('PATCH', `/admin/books/${bookId}`, { token: ADMIN, body: { isActive: false } });
  assert.equal((await call('GET', `/reading/books/${bookId}/pages/1`, { token: A, headers: { 'X-Reading-Session': s3.sessionToken } })).status, 404);
  ok('inactive book -> unavailable (404)');
  assert.equal((await call('DELETE', `/admin/books/${bookId}`, { token: ADMIN })).data.deleted, true);
  ok('admin can delete a book (and its stored files)');

  console.log(`\nAll ${passed} checks passed.`);
  return logs;
}

let failed = false;
try {
  await main();
} catch (e) {
  failed = true;
  console.error('\nFAILED:', e);
} finally {
  server?.kill();
  await pg.stop().catch(() => {});
  rmSync(dataDir, { recursive: true, force: true });
  rmSync(storageDir, { recursive: true, force: true });
  process.exit(failed ? 1 : 0);
}

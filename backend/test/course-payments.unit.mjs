// Unit tests for course payments (no database or network). Run: npm run build && node test/course-payments.unit.mjs
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { addValidity, settleCoursePayment, refundCoursePayment, isOpen } = require('../dist/courses/course-activation.js');
const { cleanCustomSvg, CoursesService } = require('../dist/courses/courses.module.js');
const { ReadingService } = require('../dist/reading/reading.module.js');
const { assertTyped } = require('../dist/audit/audit.js');

let n = 0;
const test = async (name, fn) => { await fn(); n++; console.log('ok -', name); };

// ---- in-memory Prisma double (just what settle/refund touch)
function fakePrisma({ order, enrollment = null }) {
  const db = { order: { ...order }, enrollment: enrollment && { ...enrollment }, locks: 0, grants: 0 };
  const tx = {
    $executeRaw: async () => { db.locks++; },
    coursePayment: {
      findUnique: async ({ where }) => (where.razorpayOrderId === db.order.razorpayOrderId || (where.razorpayPaymentId && where.razorpayPaymentId === db.order.razorpayPaymentId) ? { ...db.order, course: { id: 'c1', validityUnit: 'MONTH', validityValue: 1 } } : null),
      updateMany: async ({ where, data }) => { if (db.order.status === where.status) { Object.assign(db.order, data); return { count: 1 }; } return { count: 0 }; },
      update: async ({ data }) => { Object.assign(db.order, data); },
    },
    courseEnrollment: {
      findUnique: async () => (db.enrollment ? { ...db.enrollment } : null),
      upsert: async ({ create, update }) => { db.grants++; db.enrollment = db.enrollment ? { ...db.enrollment, ...update } : { ...create }; return db.enrollment; },
      update: async ({ data }) => { Object.assign(db.enrollment, data); },
    },
  };
  const prisma = { ...tx, $transaction: async (fn) => fn(tx) };
  return { prisma, db };
}
const base = { id: 'p1', userId: 'u1', courseId: 'c1', amountPaise: 50000, currency: 'INR', razorpayOrderId: 'order_1', razorpayPaymentId: null, status: 'CREATED' };

await test('validity maths is calendar aware', () => {
  assert.equal(addValidity(new Date('2026-01-31T00:00:00Z'), 'MONTH', 1).toISOString(), '2026-02-28T00:00:00.000Z');
  assert.equal(addValidity(new Date('2026-01-31T00:00:00Z'), 'YEAR', 1).toISOString(), '2027-01-31T00:00:00.000Z');
  assert.equal(addValidity(new Date(), 'LIFETIME', 1), null);
});

await test('a paid order activates the buyer once, however many times it is settled', async () => {
  const { prisma, db } = fakePrisma({ order: base });
  assert.equal(await settleCoursePayment(prisma, 'order_1', 'pay_1'), true);
  await settleCoursePayment(prisma, 'order_1', 'pay_1');
  await settleCoursePayment(prisma, 'order_1', 'pay_1');
  assert.equal(db.grants, 1);
  assert.equal(db.order.status, 'PAID');
  assert.ok(isOpen(db.enrollment));
  assert.ok(db.locks >= 1, 'takes the per-learner lock');
});

await test('an unknown order id is ignored', async () => {
  const { prisma, db } = fakePrisma({ order: base });
  assert.equal(await settleCoursePayment(prisma, 'order_other', 'pay_1'), false);
  assert.equal(db.grants, 0);
});

await test('webhook amount or currency mismatch is refused', async () => {
  for (const paid of [{ amount: 100, currency: 'INR' }, { amount: 50000, currency: 'USD' }]) {
    const { prisma, db } = fakePrisma({ order: base });
    assert.equal(await settleCoursePayment(prisma, 'order_1', 'pay_1', paid), false);
    assert.equal(db.order.status, 'CREATED');
    assert.equal(db.grants, 0);
  }
  const ok = fakePrisma({ order: base });
  await settleCoursePayment(ok.prisma, 'order_1', 'pay_1', { amount: 50000, currency: 'INR' });
  assert.equal(ok.db.grants, 1);
});

await test('a revoked learner is not re-activated by an earlier order (payment is still recorded)', async () => {
  const { prisma, db } = fakePrisma({ order: base, enrollment: { userId: 'u1', courseId: 'c1', status: 'REVOKED', source: 'ADMIN', expiresAt: null } });
  await settleCoursePayment(prisma, 'order_1', 'pay_1');
  assert.equal(db.enrollment.status, 'REVOKED');
  assert.equal(db.grants, 0);
  assert.equal(db.order.status, 'PAID');
});

await test('paying while access is running extends it from the current end date', async () => {
  const end = new Date(Date.now() + 10 * 86_400_000);
  const { prisma, db } = fakePrisma({ order: base, enrollment: { userId: 'u1', courseId: 'c1', status: 'ACTIVE', source: 'PAYMENT', activatedAt: new Date(), createdAt: new Date(), expiresAt: end } });
  await settleCoursePayment(prisma, 'order_1', 'pay_1');
  assert.ok(db.enrollment.expiresAt > end);
});

await test('a full refund ends the access it bought; a partial one does not', async () => {
  const paid = { ...base, status: 'PAID', razorpayPaymentId: 'pay_1' };
  const enr = { userId: 'u1', courseId: 'c1', status: 'ACTIVE', source: 'PAYMENT', expiresAt: new Date(Date.now() + 86_400_000) };
  const part = fakePrisma({ order: paid, enrollment: enr });
  assert.equal(await refundCoursePayment(part.prisma, 'pay_1', 100), true);
  assert.ok(isOpen(part.db.enrollment));
  const full = fakePrisma({ order: paid, enrollment: enr });
  await refundCoursePayment(full.prisma, 'pay_1', 50000);
  assert.equal(full.db.order.status, 'REFUNDED');
  assert.ok(!isOpen(full.db.enrollment));
  const gift = fakePrisma({ order: paid, enrollment: { ...enr, source: 'ADMIN' } });
  await refundCoursePayment(gift.prisma, 'pay_1', 50000);
  assert.ok(isOpen(gift.db.enrollment), 'an admin-assigned access is not ended by a refund');
  assert.equal(await refundCoursePayment(part.prisma, 'pay_unknown', 50000), false);
});

await test('custom SVG: real icons pass', () => {
  const good = '<svg viewBox="0 0 100 100"><defs><linearGradient id="g"><stop offset="0" stop-color="#b8d83d"/></linearGradient></defs><circle cx="50" cy="50" r="40" fill="url(#g)"><animate attributeName="r" values="30;40;30" dur="2s" repeatCount="indefinite"/></circle><use href="#g"/></svg>';
  assert.equal(cleanCustomSvg(good), good);
  assert.equal(cleanCustomSvg('   '), null);
});

await test('custom SVG: script vectors are rejected, including the old bypasses', () => {
  const bad = [
    '<svg viewBox="0 0 1 1"><animate/onbegin=alert(1) attributeName=x dur=1s></svg>',
    '<svg viewBox="0 0 1 1"><rect width="1"/onmouseover=alert(1)></svg>',
    '<svg viewBox="0 0 1 1"><circle r="1" onclick="alert(1)"/></svg>',
    '<svg viewBox="0 0 1 1"><script>alert(1)</script></svg>',
    '<svg viewBox="0 0 1 1"><a href="javascript:alert(1)"><circle r="1"/></a></svg>',
    '<svg viewBox="0 0 1 1"><use href="https://evil.example/x.svg#a"/></svg>',
    '<svg viewBox="0 0 1 1"><set attributeName="href" to="javascript:alert(1)"/></svg>',
    '<svg viewBox="0 0 1 1"><set attributeName="onclick" to="alert(1)"/></svg>',
    '<svg viewBox="0 0 1 1"><foreignObject><div/></foreignObject></svg>',
    '<svg viewBox="0 0 1 1"><!-- x --><circle r="1"/></svg>',
    '<svg viewBox="0 0 1 1"><circle r="1" fill="url(https://evil.example/a)"/></svg>',
    '<svg viewBox="0 0 1 1"><circle r="1" style="background:url(//evil)"/></svg>',
    '<svg viewBox="0 0 1 1"><text>&#106;avascript:alert(1)</text></svg>',
    '<svg viewBox="0 0 1 1"><svg></svg></svg>',
    '<svg viewBox="0 0 1 1"><circle r=1 /></svg>',
  ];
  for (const s of bad) assert.throws(() => cleanCustomSvg(s), /Custom icon/, s);
});

// ---- destructive admin deletes: typed confirmation, archive-not-erase, audit snapshot
const admin = { id: 'a1', email: 'admin@example.com' };
function fakeDeletePrisma({ lesson, course, task, enrolled = 0, payments = 0, submissions = 0 }) {
  const audits = []; const hard = []; const archived = [];
  const prisma = {
    adminAudit: { create: async ({ data }) => { audits.push(data); } },
    lesson: {
      findUnique: async () => lesson, count: async () => 1,
      delete: async ({ where }) => { hard.push(['lesson', where.id]); },
      update: async ({ where, data }) => { if (data.archivedAt) archived.push(['lesson', where.id]); },
    },
    course: {
      findUnique: async () => course,
      delete: async ({ where }) => { hard.push(['course', where.id]); },
      update: async ({ where, data }) => { if (data.archivedAt) archived.push(['course', where.id, data.published]); },
    },
    courseEnrollment: { count: async () => enrolled },
    coursePayment: { count: async () => payments },
    task: { findUnique: async () => task && { ...task, _count: { submissions } }, delete: async ({ where }) => { hard.push(['task', where.id]); } },
  };
  return { prisma, audits, deleted: hard, archived };
}
const lessonRow = { id: 'l1', title: 'Liquidity pools', moduleId: 'm1', archivedAt: null, module: { course: { id: 'c1', published: true } } };

await test('assertTyped needs the exact name (case and spacing tolerant)', () => {
  assert.throws(() => assertTyped(undefined, 'Liquidity pools', 'x'), /Type its exact name/);
  assert.throws(() => assertTyped('liquidity', 'Liquidity pools', 'x'));
  assert.throws(() => assertTyped('', '', 'x'));
  assertTyped('  liquidity   POOLS ', 'Liquidity pools', 'x');
});

await test('removing a lesson needs the typed name and ARCHIVES it (never a hard delete), with an audit snapshot', async () => {
  const f = fakeDeletePrisma({ lesson: lessonRow });
  const svc = new CoursesService(f.prisma, {});
  await assert.rejects(() => svc.deleteLesson('l1', undefined, admin), /Type its exact name/);
  await assert.rejects(() => svc.deleteLesson('l1', 'wrong', admin));
  assert.equal(f.archived.length, 0);
  await svc.deleteLesson('l1', 'Liquidity pools', admin);
  assert.deepEqual(f.archived, [['lesson', 'l1']]);
  assert.equal(f.deleted.length, 0, 'no row is ever erased');
  assert.equal(f.audits.length, 1);
  assert.equal(f.audits[0].action, 'ARCHIVE');
  assert.equal(f.audits[0].adminEmail, 'admin@example.com');
  assert.equal(f.audits[0].snapshot.title, 'Liquidity pools');
  await assert.rejects(() => new CoursesService(fakeDeletePrisma({ lesson: { ...lessonRow, archivedAt: new Date() } }).prisma, {}).deleteLesson('l1', 'Liquidity pools', admin), /not found/i);
});

await test('a course with learners or payments cannot be removed; an empty one is archived and unpublished, never erased', async () => {
  const course = { id: 'c1', title: 'Gold', archivedAt: null, modules: [] };
  for (const extra of [{ enrolled: 2 }, { payments: 1 }]) {
    const f = fakeDeletePrisma({ course, ...extra });
    await assert.rejects(() => new CoursesService(f.prisma, {}).deleteCourse('c1', 'Gold', admin), /cannot be removed/);
    assert.equal(f.archived.length + f.deleted.length, 0);
  }
  const f = fakeDeletePrisma({ course });
  await assert.rejects(() => new CoursesService(f.prisma, {}).deleteCourse('c1', undefined, admin), /Type its exact name/);
  await new CoursesService(f.prisma, {}).deleteCourse('c1', 'gold', admin);
  assert.deepEqual(f.archived, [['course', 'c1', false]]);
  assert.equal(f.deleted.length, 0);
  assert.equal(f.audits[0].entity, 'Course');
});

await test('deleting a task with requests only archives it: requests and book access are never touched', async () => {
  const task = { id: 't1', title: 'Share your journal', books: [{ bookId: 'b1' }, { bookId: 'b2' }] };
  const touched = [];
  const used = fakeDeletePrisma({ task, submissions: 20 });
  used.prisma.task.update = async ({ data }) => { touched.push(['task.update', data]); };
  for (const model of ['readingAccess', 'taskSubmission', 'taskBook']) {
    used.prisma[model] = new Proxy({}, { get: (_t, op) => async () => { touched.push([`${model}.${String(op)}`]); } });
  }
  const res = await new ReadingService(used.prisma).deleteTask('t1', admin);
  assert.equal(res.archived, true);
  assert.equal(res.keptSubmissions, 20);
  assert.equal(used.deleted.length, 0, 'the task row is not deleted');
  assert.deepEqual(touched.map((t) => t[0]), ['task.update'], 'nothing else is read or written: no access, submission or book-link change');
  assert.ok(touched[0][1].archivedAt instanceof Date);
  assert.equal(touched[0][1].isActive, false);
  assert.equal(used.audits[0].action, 'ARCHIVE');
  assert.equal(used.audits[0].snapshot.title, 'Share your journal');
});

await test('a task nobody used is removed outright, and is audited', async () => {
  const task = { id: 't1', title: 'Unused', books: [] };
  const unused = fakeDeletePrisma({ task, submissions: 0 });
  await new ReadingService(unused.prisma).deleteTask('t1', admin);
  assert.deepEqual(unused.deleted, [['task', 't1']]);
  assert.equal(unused.audits[0].action, 'DELETE');
  await assert.rejects(() => new ReadingService(fakeDeletePrisma({ task: { ...task, archivedAt: new Date() } }).prisma).deleteTask('t1', admin), /not found/i);
});

// ---- project-wide guards: these fail if someone later re-introduces a cascading delete or an unreviewed hard delete
await test('GUARD: no foreign key may cascade a delete, except a task\'s own list of linked books', async () => {
  const fs = require('node:fs');
  const schema = fs.readFileSync(new URL('../prisma/schema.prisma', import.meta.url), 'utf8');
  let model = ''; const cascades = [];
  for (const line of schema.split('\n')) {
    const m = line.match(/^model (\w+)/); if (m) model = m[1];
    if (/onDelete:\s*(Cascade|SetNull|SetDefault)/.test(line)) cascades.push(`${model}: ${line.trim()}`);
  }
  assert.equal(cascades.length, 1, `unexpected cascading/nulling foreign keys:\n${cascades.join('\n')}`);
  assert.match(cascades[0], /^TaskBook: task Task/);
});

await test('GUARD: hard deletes in the API are limited to a reviewed list', async () => {
  const fs = require('node:fs'); const path = require('node:path');
  const dir = path.join(path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, '$1')), '..', 'src');
  const hits = [];
  const walk = (d) => { for (const f of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, f.name);
    if (f.isDirectory()) walk(p);
    else if (f.name.endsWith('.ts')) fs.readFileSync(p, 'utf8').split('\n').forEach((l) => { const m = l.match(/prisma\.(\w+)\.(delete|deleteMany)\(/); if (m) hits.push(`${path.basename(p)}:${m[1]}.${m[2]}`); });
  } };
  walk(dir);
  const reviewed = [
    'books.module.ts:book.delete',            // cleanup of a half-created upload that nothing references yet
    'course-activation.ts:courseEnrollment.deleteMany', // admin "remove learner", audited with a snapshot
    'gallery.module.ts:galleryImage.delete',  // standalone row, audited (x2: failed-upload cleanup + admin delete)
    'platforms.module.ts:platform.delete',    // standalone row, audited (x2)
    'profit-shots.module.ts:profitShot.delete',
    'reading.module.ts:task.delete',          // only a task with no requests, audited
    'site-links.module.ts:siteLink.deleteMany', // clearing a link by saving it blank
    'testimonials.module.ts:testimonial.delete',
  ];
  const unexpected = [...new Set(hits)].filter((h) => !reviewed.includes(h));
  assert.deepEqual(unexpected, [], `new hard deletes need review (archive instead, or add to the reviewed list with a reason): ${unexpected.join(', ')}`);
});

console.log(`\n${n} passed`);

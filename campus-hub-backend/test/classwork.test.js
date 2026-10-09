import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/server.js';
import { createMemoryStore } from '../src/store/memory.js';
import { loadConfig } from '../src/config.js';
import { resolveWeekday, scopeMatches } from '../src/classwork.js';

const quiet = { debug() {}, info() {}, warn() {}, error() {} };
let server, base;
const as = (id, extra = {}) => ({ headers: { 'x-demo-user': id, 'content-type': 'application/json' }, ...extra });
const get = async (path, id) => { const r = await fetch(base + path, as(id)); return { status: r.status, body: await r.json() }; };
const post = async (path, id, body) => { const r = await fetch(base + path, as(id, { method: 'POST', body: JSON.stringify(body) })); return { status: r.status, body: await r.json() }; };

before(() => {
  server = createApp({ store: createMemoryStore(), config: loadConfig({}), logger: quiet }).listen(0);
  base = `http://localhost:${server.address().port}`;
});
after(() => server.close());

const ALL_STUDENTS = ['S101', 'S102', 'S103', 'S104', 'S105', 'S106', 'S107', 'S108', 'S109', 'S110'];

test('weekday helper: weekends fall back to Monday', () => {
  assert.deepEqual(resolveWeekday(3), { weekday: 3, fallback: false });
  assert.deepEqual(resolveWeekday(6), { weekday: 1, fallback: true });
  assert.deepEqual(resolveWeekday(7), { weekday: 1, fallback: true });
});

test('every student gets a different timetable, and only their own class', async () => {
  const seen = new Map();
  for (const id of ALL_STUDENTS) {
    const r = await get('/api/schedule?weekday=2', id);
    assert.equal(r.status, 200);
    assert.ok(r.body.data.length > 0, `${id} has classes on Tuesday`);
    const dept = new Set(r.body.data.map((x) => x.dept)), year = new Set(r.body.data.map((x) => x.year));
    assert.equal(dept.size, 1); assert.equal(year.size, 1);
    seen.set(id, JSON.stringify(r.body.data.map((x) => [x.start, x.subject, x.room])));
  }
  assert.equal(new Set(seen.values()).size, 10, 'all 10 timetables are different');
  const cse = await get('/api/schedule?weekday=1', 'S101'), mech = await get('/api/schedule?weekday=1', 'S110');
  assert.ok(cse.body.data.every((x) => x.dept === 'CSE' && x.year === 2));
  assert.ok(mech.body.data.every((x) => x.dept === 'MECH' && x.year === 3));
});

test('faculty see only the classes they teach, with names', async () => {
  const r = await get('/api/schedule?weekday=1', 'F201');
  assert.ok(r.body.data.length > 0);
  assert.ok(r.body.data.every((x) => x.faculty === 'Dr. Meera Iyer'));
  const rooms = new Set(r.body.data.map((x) => x.classLabel));
  assert.ok([...rooms].every((c) => c.startsWith('CSE ')));
});

test('weekend request returns Monday and says so', async () => {
  const r = await get('/api/schedule?weekday=7', 'S101');
  assert.equal(r.body.meta.weekday, 1);
  assert.equal(r.body.meta.weekendFallback, true);
});

test('tasks are per class: students see theirs, faculty see what they published', async () => {
  const s101 = await get('/api/tasks', 'S101'), s110 = await get('/api/tasks', 'S110'), s102 = await get('/api/tasks', 'S102');
  assert.deepEqual(s101.body.data.map((t) => t.title).sort(), ['Coding Club Membership Form', 'Linked List Operations in C']);
  assert.ok(s110.body.data.every((t) => t.dept === 'MECH' && t.year === 3) && s110.body.data.length === 2);
  assert.ok(!s102.body.data.some((t) => t.title === 'Linked List Operations in C'));
  const f209 = await get('/api/tasks', 'F209');
  assert.ok(f209.body.data.length > 0 && f209.body.data.every((t) => t.dept === 'MECH'));
});

test('faculty publish a task for one class; only that class sees it; students cannot publish', async () => {
  assert.equal((await post('/api/tasks', 'S101', { title: 'x', kind: 'form', year: 2 })).status, 403);
  assert.equal((await post('/api/tasks', 'F201', { title: '', kind: 'form', year: 2 })).status, 400);
  const made = await post('/api/tasks', 'F201', { title: 'Hash Table Lab Report', kind: 'assignment', marks: 15, due: 'Tue', fields: ['Drive link'], year: 3 });
  assert.equal(made.status, 201);
  assert.equal(made.body.data.classLabel, 'CSE III year');
  assert.ok((await get('/api/tasks', 'S102')).body.data.some((t) => t.title === 'Hash Table Lab Report'));
  assert.ok(!(await get('/api/tasks', 'S101')).body.data.some((t) => t.title === 'Hash Table Lab Report'));
  assert.ok(!(await get('/api/tasks', 'S104')).body.data.some((t) => t.title === 'Hash Table Lab Report'));
  assert.ok((await get('/api/tasks', 'F201')).body.data.some((t) => t.title === 'Hash Table Lab Report'));
});

test('task submission is saved per student and limited to their own class', async () => {
  const task = (await get('/api/tasks', 'S101')).body.data[0];
  assert.equal(task.done, false);
  assert.equal((await post(`/api/tasks/${task.id}/submit`, 'S101', {})).status, 200);
  assert.equal((await get('/api/tasks', 'S101')).body.data.find((t) => t.id === task.id).done, true);
  assert.equal((await post(`/api/tasks/${task.id}/submit`, 'S110', {})).status, 404, 'other class cannot submit it');
  assert.equal((await post(`/api/tasks/${task.id}/submit`, 'F201', {})).status, 403);
});

test('broadcast scopes', () => {
  const s = { role: 'student', dept: 'CSE', year: 2, section: 'A' };
  assert.equal(scopeMatches('College', s), true);
  assert.equal(scopeMatches('Department CSE', s), true);
  assert.equal(scopeMatches('Department ECE', s), false);
  assert.equal(scopeMatches('Class CSE II Year', s), true);
  assert.equal(scopeMatches('Class CSE III Year', s), false);
  assert.equal(scopeMatches('Class CSE Y2', s), true);
  assert.equal(scopeMatches('Section CSE-A', s), true);
  assert.equal(scopeMatches('Section CSE-B', s), false);
  assert.equal(scopeMatches('Something odd', s), false);
});

test('broadcasts reach exactly the right class', async () => {
  const titles = async (id) => (await get('/api/broadcasts', id)).body.data.map((b) => b.title);
  const s101 = await titles('S101');
  assert.ok(s101.includes('Database Systems quiz on Thursday') && s101.includes('Course feedback survey is open'));
  assert.ok(!s101.includes('Compiler Design lab record check'), 'CSE III broadcast hidden from CSE II');
  assert.ok(!s101.includes('Fluid Mechanics tutorial moved'));

  const sent = await post('/api/broadcasts', 'F203', { audience: 'class', year: 3, title: 'Lab viva rescheduled', body: 'Moved to Friday.' });
  assert.equal(sent.status, 201);
  assert.equal(sent.body.data.scope, 'Class ECE III Year');
  assert.ok((await titles('S104')).includes('Lab viva rescheduled'));
  for (const other of ['S101', 'S103', 'S110']) assert.ok(!(await titles(other)).includes('Lab viva rescheduled'), `${other} must not see it`);

  await post('/api/broadcasts', 'F205', { audience: 'department', title: 'EEE department meet', body: 'Seminar hall at 4.' });
  assert.ok((await titles('S105')).includes('EEE department meet') && (await titles('S106')).includes('EEE department meet'));
  assert.ok(!(await titles('S107')).includes('EEE department meet'));

  assert.equal((await post('/api/broadcasts', 'F201', { audience: 'class', title: 't', body: 'b' })).status, 400, 'class needs a year');
  assert.equal((await post('/api/broadcasts', 'S101', { audience: 'college', title: 't', body: 'b' })).status, 403);
});

test('endpoints require sign-in', async () => {
  for (const p of ['/api/schedule', '/api/tasks', '/api/broadcasts']) assert.equal((await fetch(base + p)).status, 401);
});

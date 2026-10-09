import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/server.js';
import { createMemoryStore } from '../src/store/memory.js';
import { loadConfig } from '../src/config.js';

const quiet = { debug() {}, info() {}, warn() {}, error() {} };
const config = loadConfig({ ADMIN_API_KEY: 'test-admin-key' });
let server, base;
const admin = { 'x-admin-key': 'test-admin-key', 'content-type': 'application/json' };
const api = async (path, opts = {}) => { const r = await fetch(base + path, opts); return { status: r.status, body: await r.json() }; };

before(async () => {
  const app = createApp({ store: createMemoryStore(), config, logger: quiet });
  server = app.listen(0);
  base = `http://localhost:${server.address().port}`;
});
after(() => server.close());

test('health', async () => {
  const r = await api('/health');
  assert.equal(r.status, 200);
  assert.equal(r.body.store, 'memory');
});

test('admin endpoints reject missing key, user endpoints reject anonymous', async () => {
  assert.equal((await api('/api/ingest/gmail', { method: 'POST' })).status, 401);
  assert.equal((await api('/api/updates')).status, 401);
  assert.equal((await api('/api/updates', { headers: { 'x-demo-user': 'NOPE' } })).status, 401);
});

test('validation errors are 400 with details', async () => {
  const r = await api('/api/ingest/emails', { method: 'POST', headers: admin, body: JSON.stringify({ emails: [] }) });
  assert.equal(r.status, 400);
  assert.equal(r.body.error.code, 'VALIDATION_ERROR');
  const bad = await api('/api/ingest/emails', { method: 'POST', headers: admin, body: '{oops' });
  assert.equal(bad.body.error.code, 'BAD_JSON');
});

test('end to end: ingest, relevance, consolidation, read state', async () => {
  const run = await api('/api/ingest/gmail', { method: 'POST', headers: admin });
  assert.equal(run.status, 200);
  assert.deepEqual([run.body.created, run.body.merged], [9, 3]);

  const s101 = await api('/api/updates', { headers: { 'x-demo-user': 'S101' } });
  const titles = s101.body.data.map((u) => u.title);
  assert.equal(titles.filter((t) => /Internal Assessment 2/i.test(t)).length, 1, 'one consolidated IA2 update');
  const ia2 = s101.body.data.find((u) => /Internal Assessment 2/i.test(u.title));
  assert.equal(ia2.duplicateCount, 3);
  assert.equal(ia2.alsoSentBy.length, 2);
  assert.ok(!titles.some((t) => /Faculty meeting/.test(t)));

  const f201 = await api('/api/updates', { headers: { 'x-demo-user': 'F201' } });
  assert.ok(f201.body.data.some((u) => /Faculty meeting/.test(u.title)));

  const fees = await api('/api/updates?category=Fees', { headers: { 'x-demo-user': 'S101' } });
  assert.deepEqual(fees.body.data.map((u) => u.category), ['Fees']);

  await api(`/api/updates/${ia2.id}/read`, { method: 'POST', headers: { 'x-demo-user': 'S101' } });
  const unread = await api('/api/updates?unread=true', { headers: { 'x-demo-user': 'S101' } });
  assert.ok(!unread.body.data.some((u) => u.id === ia2.id));
});

test('debug endpoints', async () => {
  const a = await api('/api/debug/analyze', { method: 'POST', headers: admin, body: JSON.stringify({ subject: 'Scholarship for II year CSE-A students', body: '' }) });
  assert.equal(a.body.category, 'Scholarships');
  assert.ok(a.body.visibleTo.some((x) => x.startsWith('S101')));
  assert.ok(a.body.hiddenFrom.some((x) => x.startsWith('S102')) && a.body.hiddenFrom.some((x) => x.startsWith('S103')));
  const s = await api('/api/debug/similarity', { method: 'POST', headers: admin, body: JSON.stringify({
    a: { subject: 'Internal Assessment 2 Timetable', date: '2026-10-05T09:00:00Z' }, b: { subject: 'Internal Assessment 3 Timetable', date: '2026-10-06T09:00:00Z' } }) });
  assert.equal(s.body.wouldMerge, false);
});

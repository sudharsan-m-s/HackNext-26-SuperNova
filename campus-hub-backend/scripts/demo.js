// Runs all three operations against a running server and prints a readable report.
//   npm start        (terminal 1)
//   npm run demo     (terminal 2)
import 'dotenv/config';

const BASE = process.env.API_URL || 'http://localhost:8787';
const ADMIN = process.env.ADMIN_API_KEY || 'dev-admin-key';
const line = (t) => console.log(`\n=== ${t} ===`);

async function call(path, { method = 'GET', headers = {}, body } = {}) {
  const res = await fetch(BASE + path, { method, headers: { 'content-type': 'application/json', ...headers }, body: body && JSON.stringify(body) });
  const json = await res.json();
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status} ${JSON.stringify(json.error)}`);
  return json;
}

async function viewerHeaders(loginId, mode) {
  if (mode === 'memory') return { 'x-demo-user': loginId };
  const { createClient } = await import('@supabase/supabase-js');
  const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
  const { data, error } = await sb.auth.signInWithPassword({ email: `${loginId.toLowerCase()}@campus.hub`, password: 'demo123' });
  if (error) throw new Error(`Login failed for ${loginId}: ${error.message} (set SUPABASE_ANON_KEY in .env)`);
  return { authorization: `Bearer ${data.session.access_token}` };
}

const health = await call('/health');
console.log('Server:', health);

line('1. GMAIL -> INSTITUTIONAL UPDATES (ingest + classify)');
const run = await call('/api/ingest/gmail', { method: 'POST', headers: { 'x-admin-key': ADMIN } });
console.log(`fetched=${run.fetched} created=${run.created} merged=${run.merged} skipped=${run.skipped} failed=${run.failed}`);
for (const i of run.items) console.log(`  ${i.id}  ${i.status.padEnd(8)} ${(i.category || '').padEnd(13)} ${i.title || i.into || i.reason || ''}`);

line('2. RELEVANCE ENGINE (what each person sees)');
for (const who of ['S101', 'S102', 'S104', 'F201']) {
  const r = await call('/api/updates', { headers: await viewerHeaders(who, health.store) });
  const v = r.meta.viewer;
  console.log(`\n${who} ${v.name} (${v.role}, ${v.dept}${v.year ? ', year ' + v.year : ''}${v.section ? ', sec ' + v.section : ''}) -> ${r.data.length} updates`);
  for (const u of r.data) console.log(`  [${u.category}] ${u.title}${u.urgent ? '  (urgent)' : ''}${u.duplicateCount > 1 ? `  x${u.duplicateCount} merged` : ''}`);
}

line('3. DUPLICATE DETECTION (consolidated, not repeated)');
const s = await call('/api/updates', { headers: await viewerHeaders('S101', health.store) });
for (const u of s.data.filter((x) => x.duplicateCount > 1)) {
  console.log(`${u.title}  <- ${u.duplicateCount} emails became 1 update`);
  for (const a of u.alsoSentBy) console.log(`     also: ${a.sender} | ${a.subject}`);
}
const sim = (a, b) => call('/api/debug/similarity', { method: 'POST', headers: { 'x-admin-key': ADMIN }, body: { a, b } });
const a = { subject: 'Internal Assessment 2 Timetable', body: 'Exam cell notice.', date: '2026-10-05T09:00:00Z' };
const same = await sim(a, { subject: 'Reminder: Internal Assessment 2 timetable', body: 'Exam cell notice.', date: '2026-10-07T09:00:00Z' });
const diff = await sim(a, { subject: 'Internal Assessment 3 Timetable', body: 'Exam cell notice.', date: '2026-10-07T09:00:00Z' });
console.log(`\nIA2 vs "Reminder: IA2" -> score ${same.score}, wouldMerge=${same.wouldMerge}`);
console.log(`IA2 vs IA3             -> score ${diff.score}, wouldMerge=${diff.wouldMerge} (${diff.blocked})`);

line('IDEMPOTENCY (run ingest again)');
const again = await call('/api/ingest/gmail', { method: 'POST', headers: { 'x-admin-key': ADMIN } });
console.log(`created=${again.created} merged=${again.merged} skipped=${again.skipped}  (expect created=0, skipped=${run.fetched})`);

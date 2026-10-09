import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { analyze } from '../src/analyze.js';
import { classify } from '../src/classify.js';
import { extractAudience, isRelevant } from '../src/audience.js';
import { similarity, asCandidate } from '../src/dedupe.js';
import { ingestEmails } from '../src/pipeline.js';
import { createMemoryStore } from '../src/store/memory.js';
import { loadConfig } from '../src/config.js';
import { parseMessage } from '../src/gmail.js';
import { cleanBody, normSubject } from '../src/text.js';

const emails = JSON.parse(readFileSync(new URL('../fixtures/emails.json', import.meta.url)));
const config = loadConfig({});
const quiet = { debug() {}, info() {}, warn() {}, error() {} };
const mail = (subject, body = '', date = '2026-10-06T10:00:00Z') => ({ subject, body, date });

// ---------- Operation 1: classify + extract ----------
test('classifier picks the right category', () => {
  const cases = [
    ['Internal Assessment 2 Timetable', 'Exam Cell', 'Exams'],
    ['CSE: Placement drive - Zoho', '', 'Placements'],
    ['Fee payment last date extended', '', 'Fees'],
    ['Campus closed on Friday (festival holiday)', '', 'Holiday'],
    ['Tech Fest 2026 - Registrations Open', 'Pick events', 'Events'],
    ['Scholarship applications open', '', 'Scholarships'],
    ['Lunch menu', 'Rice and dal', 'General'],
  ];
  for (const [s, b, want] of cases) assert.equal(classify(s, b).category, want, s);
});

test('urgent flag is detected', () => {
  assert.equal(classify('Fee payment last date extended', '').urgent, true);
  assert.equal(classify('Lab manual uploaded', '').urgent, false);
});

test('text cleaning strips replies, prefixes and signatures', () => {
  assert.equal(normSubject('RE: Reminder: [Circular] Exam timetable!'), 'exam timetable');
  assert.equal(cleanBody('Hello\n> quoted\nOn Mon, 5 Oct 2026 at 9:00 AM X wrote:\nold'), 'Hello');
  assert.equal(cleanBody('Notice here\n-- \nHOD CSE'), 'Notice here');
});

test('gmail message parsing handles base64url bodies', () => {
  const enc = (s) => Buffer.from(s).toString('base64url');
  const msg = { id: 'abc', internalDate: '1790000000000', payload: { headers: [{ name: 'From', value: 'A <a@x.edu>' }, { name: 'Subject', value: 'Hi' }, { name: 'Date', value: 'Mon, 5 Oct 2026 09:00:00 +0000' }],
    parts: [{ mimeType: 'text/html', body: { data: enc('<p>html</p>') } }, { mimeType: 'text/plain', body: { data: enc('plain body') } }] } };
  const p = parseMessage(msg);
  assert.deepEqual([p.id, p.from, p.subject, p.body, p.date], ['abc', 'A <a@x.edu>', 'Hi', 'plain body', '2026-10-05T09:00:00.000Z']);
});

// ---------- Operation 2: relevance ----------
test('audience extraction: departments, years, sections, roles', () => {
  assert.deepEqual(extractAudience({ subject: 'Scholarship for II year CSE-B students' }),
    { departments: ['CSE'], years: [2], sections: ['CSE-B'], roles: [] });
  assert.deepEqual(extractAudience({ subject: 'Lab for II & III year ECE' }).years, [2, 3]);
  assert.deepEqual(extractAudience({ subject: 'Seminar', body: 'For final year students of Mechanical and Civil' }).departments, ['CIVIL', 'MECH']);
  assert.deepEqual(extractAudience({ subject: 'Holiday', body: 'Applies to all departments and all years' }), { departments: [], years: [], sections: [], roles: [] });
  assert.deepEqual(extractAudience({ subject: 'Faculty meeting' }).roles, ['faculty']);
});

test('relevance matrix', () => {
  const s = (dept, year, section) => ({ role: 'student', dept, year, section });
  const f = { role: 'faculty', dept: 'CSE' };
  const cseFinal = { departments: ['CSE'], years: [4], sections: [], roles: [] };
  assert.equal(isRelevant(cseFinal, s('CSE', 4, 'A')), true);
  assert.equal(isRelevant(cseFinal, s('CSE', 3, 'A')), false);
  assert.equal(isRelevant(cseFinal, s('ECE', 4, 'A')), false);
  assert.equal(isRelevant({ sections: ['CSE-B'] }, s('CSE', 2, 'B')), true);
  assert.equal(isRelevant({ sections: ['CSE-B'] }, s('CSE', 2, 'A')), false);
  assert.equal(isRelevant({ sections: ['B'] }, s('ECE', 2, 'B')), true);
  assert.equal(isRelevant({ roles: ['faculty'] }, s('CSE', 2, 'B')), false);
  assert.equal(isRelevant({ roles: ['faculty'] }, f), true);
  assert.equal(isRelevant(cseFinal, f), true, 'faculty ignore year');
  assert.equal(isRelevant({}, s('CSE', 1, 'A')), true, 'empty audience = everyone');
  assert.equal(isRelevant(cseFinal, { role: 'student', dept: 'CSE' }), true, 'missing fields fail open');
});

// ---------- Operation 3: duplicates ----------
const sim = (a, b) => similarity(asCandidate(analyze(a)), asCandidate(analyze(b)));

test('reminders and re-sends are duplicates', () => {
  assert.ok(sim(mail('Internal Assessment 2 Timetable'), mail('Reminder: Internal Assessment 2 timetable', '', '2026-10-07T10:00:00Z')).score >= 0.65);
  assert.ok(sim(mail('Tech Fest 2026 - Registrations Open'), mail('Technical Fest 2026: registrations are now open', '', '2026-10-06T15:00:00Z')).score >= 0.65);
});

test('look-alikes are NOT merged', () => {
  assert.equal(sim(mail('Internal Assessment 2 Timetable'), mail('Internal Assessment 3 Timetable')).blocked, 'different-numbers');
  assert.equal(sim(mail('CSE: Placement drive - Zoho'), mail('ECE: Placement drive - Zoho')).blocked, 'different-audience');
  assert.equal(sim(mail('Exam timetable'), mail('Exam timetable', '', '2026-11-20T10:00:00Z')).blocked, 'time-window');
});

// ---------- Full pipeline ----------
test('pipeline: 12 emails -> 9 updates, merges, idempotent re-run', async () => {
  const store = createMemoryStore();
  const run1 = await ingestEmails(emails, { store, config, logger: quiet });
  assert.deepEqual([run1.created, run1.merged, run1.skipped, run1.failed], [9, 3, 0, 0]);

  const ia2 = (await store.listUpdates({ limit: 50 })).find((u) => u.norm_subject === 'internal assessment 2 timetable');
  assert.equal(ia2.duplicate_count, 3, 'm01 + m02 + m12 consolidated');
  assert.equal((await store.listSources([ia2.id])).get(ia2.id).length, 3);

  const run2 = await ingestEmails(emails, { store, config, logger: quiet });
  assert.deepEqual([run2.created, run2.merged, run2.skipped], [0, 0, 12]);
});

test('pipeline: bad input is reported, not thrown', async () => {
  const store = createMemoryStore();
  const run = await ingestEmails([{ id: '' }, { id: 'ok1', subject: 'Hello', body: 'x' }, { nope: 1 }], { store, config, logger: quiet });
  assert.deepEqual([run.created, run.failed], [1, 2]);
});

test('pipeline: relevance per student on the fixture set', async () => {
  const store = createMemoryStore();
  await ingestEmails(emails, { store, config, logger: quiet });
  const rows = await store.listUpdates({ limit: 50 });
  const titlesFor = async (id) => { const p = await store.getProfile(id); return rows.filter((r) => isRelevant(r.audience, p)).map((r) => r.title); };
  const s101 = await titlesFor('S101'), s102 = await titlesFor('S102'), s104 = await titlesFor('S104');
  const f201 = await titlesFor('F201'), f203 = await titlesFor('F203');
  const sch = 'Scholarship applications for II year CSE-A students';
  assert.ok(s101.includes(sch), 'CSE II year sees the CSE-A scholarship');
  assert.ok(!s102.includes(sch), 'CSE III year does not');
  assert.ok(s102.includes('CSE: Placement drive - Zoho, 12 Oct'), 'CSE III year sees the CSE drive');
  assert.ok(!s101.includes('CSE: Placement drive - Zoho, 12 Oct'));
  assert.ok(s104.includes('ECE: Placement drive - Zoho, 12 Oct'), 'ECE III year sees the ECE drive');
  assert.ok(![...s101, ...s102].includes('ECE: Placement drive - Zoho, 12 Oct'));
  assert.ok(!s104.includes('CSE: Placement drive - Zoho, 12 Oct'));
  assert.ok(!f203.includes('CSE: Placement drive - Zoho, 12 Oct'), 'ECE faculty do not see CSE-only notices');
  assert.ok(!s101.includes('Faculty meeting on Monday 3 PM'));
  assert.ok(f201.includes('Faculty meeting on Monday 3 PM') && f203.includes('Faculty meeting on Monday 3 PM'));
});

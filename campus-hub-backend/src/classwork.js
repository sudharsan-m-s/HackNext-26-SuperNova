// Who sees which timetable row, task and broadcast. Pure functions, easy to test.

export const ROMAN = { 1: 'I', 2: 'II', 3: 'III', 4: 'IV' };
const YEAR_OF = { I: 1, II: 2, III: 3, IV: 4 };

// ISO weekday (1 = Monday ... 7 = Sunday) in India time.
export function isoWeekday(now = new Date()) {
  const d = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })).getDay();
  return d === 0 ? 7 : d;
}

// The timetable only has Monday-Friday. On a weekend we show Monday and say so.
export function resolveWeekday(requested, now = new Date()) {
  const w = requested ?? isoWeekday(now);
  return w > 5 ? { weekday: 1, fallback: true } : { weekday: w, fallback: false };
}

export const classLabel = (dept, year) => `${dept} ${ROMAN[year] || year} year`;

// Students see their own department + year. Faculty see the classes they teach.
export function scheduleVisibleTo(row, p) {
  if (p.role === 'faculty') return row.faculty_id === p.id;
  return row.dept === p.dept && Number(row.year) === Number(p.year);
}

// Students: their department + year (missing fields on old rows fail open). Faculty: what they published.
export function taskVisibleTo(task, p) {
  if (p.role === 'faculty') return task.author === p.id;
  if (task.dept && p.dept && task.dept !== p.dept) return false;
  if (task.year && p.year && Number(task.year) !== Number(p.year)) return false;
  return true;
}

// Broadcast scopes: "College", "Department CSE", "Class CSE II Year", plus older "Section CSE-B" / "Class CSE Y2".
export function scopeMatches(scope = '', p) {
  const s = String(scope).trim();
  let m;
  if (/^college$/i.test(s)) return true;
  if ((m = s.match(/^department\s+([A-Z]+)$/i))) return m[1].toUpperCase() === p.dept;
  if ((m = s.match(/^class\s+([A-Z]+)\s+(IV|III|II|I)\s+year$/i))) return m[1].toUpperCase() === p.dept && YEAR_OF[m[2].toUpperCase()] === Number(p.year);
  if ((m = s.match(/^class\s+([A-Z]+)\s+Y([1-4])$/i))) return m[1].toUpperCase() === p.dept && Number(m[2]) === Number(p.year);
  if ((m = s.match(/^section\s+([A-Z]+)-([A-D])$/i))) return m[1].toUpperCase() === p.dept && m[2].toUpperCase() === p.section;
  return false; // unknown scope: hide rather than leak
}

export const broadcastVisibleTo = (b, p) => (p.role === 'faculty' ? b.author === p.id : scopeMatches(b.scope, p));

export const scopeFor = (audience, dept, year) =>
  audience === 'college' ? 'College' : audience === 'department' ? `Department ${dept}` : `Class ${dept} ${ROMAN[year]} Year`;

// ---- response shapes ----
export const scheduleView = (r) => ({
  id: r.id, weekday: r.weekday, start: String(r.start_t).slice(0, 5), end: String(r.end_t).slice(0, 5),
  subject: r.subject, room: r.room, faculty: r.faculty_name || null, dept: r.dept, year: r.year,
  section: r.section, kind: r.kind || 'theory', status: r.status || 'normal', classLabel: classLabel(r.dept, r.year),
});
export const taskView = (t, done) => ({
  id: t.id, title: t.title, kind: t.kind, marks: t.marks, due: t.due, fields: Array.isArray(t.fields) ? t.fields : [],
  dept: t.dept, year: t.year, section: t.section, classLabel: t.dept ? classLabel(t.dept, t.year) : null, done: Boolean(done),
});
export const broadcastView = (b) => ({
  id: b.id, from: b.author_name || null, scope: b.scope, title: b.title, body: b.body, createdAt: b.created_at,
});

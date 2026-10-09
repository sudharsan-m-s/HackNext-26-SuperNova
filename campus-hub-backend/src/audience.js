// Rule-based audience extraction + relevance matching.
// Audience shape: { departments: ['CSE'], years: [2], sections: ['B' | 'CSE-B'], roles: ['faculty'] }
// An empty list means "no restriction".

const DEPT_PATTERNS = {
  CSE: [/\bcse\b/i, /computer science/i],
  ECE: [/\bece\b/i, /electronics (?:and|&) communication/i],
  EEE: [/\beee\b/i, /electrical (?:and|&) electronics/i],
  MECH: [/\bmech\b/i, /\bmechanical\b/i],
  CIVIL: [/\bcivil\b/i],
  IT: [/information technology/i, /\bIT (?:dept|department|students?)\b/],
  AIDS: [/\bai ?(?:&|and) ?ds\b/i, /\baids\b/i, /artificial intelligence (?:and|&) data science/i],
};
const DEPT_SEC = /\b(CSE|ECE|EEE|MECH|CIVIL|IT|AIDS)[- ]([A-D])\b/g; // case-sensitive on purpose

const YEAR_WORDS = { first: 1, '1st': 1, second: 2, '2nd': 2, third: 3, '3rd': 3, fourth: 4, '4th': 4, final: 4, i: 1, ii: 2, iii: 3, iv: 4 };
const YW = '(?:first|second|third|fourth|final|1st|2nd|3rd|4th|iv|iii|ii|i)';
const YEAR_RE = new RegExp(`\\b(${YW}(?:\\s*(?:,|&|and|/)\\s*${YW})*)\\s*[-\\s]?(?:year|yr)s?\\b`, 'gi');

const uniqSorted = (arr) => [...new Set(arr)].sort();

function findDepartments(t) {
  const found = Object.entries(DEPT_PATTERNS).filter(([, res]) => res.some((re) => re.test(t))).map(([d]) => d);
  for (const m of t.matchAll(DEPT_SEC)) found.push(m[1]);
  return uniqSorted(found);
}

function findYears(t) {
  const out = [];
  for (const m of t.matchAll(YEAR_RE)) {
    for (const w of m[1].toLowerCase().split(/[^a-z0-9]+/).filter(Boolean)) if (YEAR_WORDS[w]) out.push(YEAR_WORDS[w]);
  }
  for (const m of t.matchAll(/\byear\s*([1-4])\b/gi)) out.push(+m[1]);
  for (const m of t.matchAll(/\by([1-4])\b/gi)) out.push(+m[1]);
  return [...new Set(out)].sort((a, b) => a - b);
}

function findSections(t) {
  const out = [];
  for (const m of t.matchAll(/\bsec(?:tion)?s?\.?\s*[-:]?\s*([A-D])\b/gi)) out.push(m[1].toUpperCase());
  for (const m of t.matchAll(DEPT_SEC)) out.push(`${m[1]}-${m[2]}`);
  return uniqSorted(out);
}

function findRoles(t) {
  const faculty = /\b(?:faculty|faculties|staff|teachers?|hods?|professors?)\b/i.test(t);
  const student = /\b(?:students?|candidates|scholars?)\b/i.test(t);
  const studentsOnly = /\bstudents only\b|\bfor (?:all )?students\b/i.test(t);
  if (faculty && !student) return ['faculty'];
  if (studentsOnly && !faculty) return ['student'];
  return [];
}

// Subject wins over body: a precise subject beats noisy signatures further down the email.
const subjectFirst = (fn, subject, body) => {
  const s = fn(subject);
  return s.length ? s : fn(body);
};

export function extractAudience({ subject = '', body = '' }) {
  const text = `${subject}\n${body}`;
  let departments = subjectFirst(findDepartments, subject, body);
  let years = subjectFirst(findYears, subject, body);
  const sections = subjectFirst(findSections, subject, body);
  if (/\ball (?:departments|branches|streams)\b|\bentire (?:college|campus)\b|\bcollege[- ]wide\b/i.test(text)) departments = [];
  if (/\ball (?:years|batches)\b/i.test(text)) years = [];
  return { departments, years, sections, roles: subjectFirst(findRoles, subject, body) };
}

// profile: { role: 'student'|'faculty', dept, year, section }
// Missing profile fields fail OPEN (we'd rather show a notice than hide it).
export function isRelevant(aud, p) {
  const A = (k) => (Array.isArray(aud?.[k]) ? aud[k] : []);
  if (A('roles').length && !A('roles').includes(p.role)) return false;
  if (A('departments').length && p.dept && !A('departments').includes(p.dept)) return false;
  if (p.role !== 'student') return true; // faculty: role + department only
  if (A('years').length && p.year && !A('years').includes(Number(p.year))) return false;
  if (A('sections').length && p.section) {
    const ok = A('sections').some((s) => (s.includes('-') ? s === `${p.dept}-${p.section}` : s === p.section));
    if (!ok) return false;
  }
  return true;
}

// Two announcements may only be merged if they target the same people.
export function audienceCompatible(a = {}, b = {}) {
  const same = (k) => JSON.stringify(a[k] || []) === JSON.stringify(b[k] || []);
  if (!(same('departments') && same('years') && same('sections'))) return false;
  const ra = a.roles || [], rb = b.roles || [];
  return !(ra.length && rb.length && JSON.stringify(ra) !== JSON.stringify(rb));
}

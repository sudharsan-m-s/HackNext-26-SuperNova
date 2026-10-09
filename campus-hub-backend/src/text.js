// Text helpers: cleaning, tokenizing, similarity maths. Pure functions, no I/O.

const STOP = new Set(
  ('the and for are was were with this that from have has had will shall you your all any can not but our their they them ' +
   'his her its into over under about also please kindly dear regards sir madam student students college department dept ' +
   'thanks thank note attached information inform informed hereby regarding there here been being would could should may ' +
   'must who whom which what when where how than then these those such upon onto out per via etc').split(/\s+/)
);

export function htmlToText(html = '') {
  return String(html)
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<br\s*\/?>|<\/(p|div|li|tr|h\d)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n\n').trim();
}

// Remove quoted replies, signatures and mobile footers so they don't pollute keywords/audience.
export function cleanBody(raw = '') {
  let t = String(raw).replace(/\r\n?/g, '\n');
  t = t.split('\n').filter((l) => !l.trim().startsWith('>')).join('\n');
  t = t.split(/\nOn .{5,120} wrote:\s*(?:\n|$)/)[0];
  t = t.split(/\n-- ?\n/)[0];
  t = t.split(/\nSent from my /i)[0];
  return t.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim().slice(0, 5000);
}

// "Re: Reminder: [Circular] Exam timetable!" -> "exam timetable"
export function normSubject(s = '') {
  let t = String(s).toLowerCase().replace(/\[[^\]]*\]/g, ' ');
  let prev;
  do {
    prev = t;
    t = t.replace(/^\s*(re|fwd?|fw|final reminder|reminder|urgent|important|notice|circular|updated?)\s*[:\-–—]\s*/, '');
  } while (t !== prev);
  return t.replace(/[^a-z0-9]+/g, ' ').trim();
}

const stem = (w) => (w.length > 4 && w.endsWith('s') && !w.endsWith('ss') ? w.slice(0, -1) : w);

export function tokens(text = '') {
  return (String(text).toLowerCase().match(/[a-z0-9]+/g) || [])
    .filter((w) => (w.length >= 3 || /^\d+$/.test(w)) && !STOP.has(w))
    .map(stem);
}

// Top-N keywords. Subject words count 3x, body words (first 1500 chars) count 1x.
export function topKeywords(subject, body, n = 12) {
  const freq = new Map();
  for (const t of tokens(subject)) freq.set(t, (freq.get(t) || 0) + 3);
  for (const t of tokens(String(body).slice(0, 1500))) freq.set(t, (freq.get(t) || 0) + 1);
  return [...freq].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, n).map((x) => x[0]);
}

// Dice coefficient on character bigrams: forgiving to small wording changes.
export function dice(a, b) {
  if (a === b) return a ? 1 : 0;
  if (a.length < 2 || b.length < 2) return 0;
  const grams = (s) => {
    const m = new Map();
    for (let i = 0; i < s.length - 1; i++) m.set(s.slice(i, i + 2), (m.get(s.slice(i, i + 2)) || 0) + 1);
    return m;
  };
  const A = grams(a), B = grams(b);
  let hit = 0;
  for (const [g, c] of A) hit += Math.min(c, B.get(g) || 0);
  return (2 * hit) / (a.length - 1 + (b.length - 1));
}

export function jaccard(a, b) {
  if (!a.size && !b.size) return 0;
  let hit = 0;
  for (const x of a) if (b.has(x)) hit++;
  return hit / (a.size + b.size - hit);
}

export const numbersIn = (s) => new Set(String(s).match(/\d+/g) || []);

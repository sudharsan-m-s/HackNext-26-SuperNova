import { dice, jaccard, numbersIn } from './text.js';
import { audienceCompatible } from './audience.js';

// Works on both fresh analyses and database rows.
export const asCandidate = (x) => ({
  normSubject: x.normSubject ?? x.norm_subject ?? '',
  keywords: x.keywords || [],
  audience: x.audience || {},
  receivedAt: Date.parse(x.receivedAt ?? x.received_at ?? x.created_at),
});

// "IA 2" vs "IA 3" are different announcements even if every other word matches.
function numbersConflict(a, b) {
  const A = numbersIn(a), B = numbersIn(b);
  if (!A.size || !B.size) return false;
  const subset = (x, y) => [...x].every((n) => y.has(n));
  return !(subset(A, B) || subset(B, A));
}

export function similarity(a, b, { windowDays = 7 } = {}) {
  const days = Math.abs(a.receivedAt - b.receivedAt) / 86400000;
  if (!(days <= windowDays)) return { score: 0, blocked: 'time-window' };
  if (!audienceCompatible(a.audience, b.audience)) return { score: 0, blocked: 'different-audience' };
  if (numbersConflict(a.normSubject, b.normSubject)) return { score: 0, blocked: 'different-numbers' };

  const subject = dice(a.normSubject, b.normSubject);
  const keywords = jaccard(new Set(a.keywords), new Set(b.keywords));
  const date = 1 - days / windowDays;
  const score = a.normSubject && a.normSubject === b.normSubject ? 1 : 0.55 * subject + 0.35 * keywords + 0.1 * date;
  return { score: Number(score.toFixed(3)), blocked: null, parts: { subject: +subject.toFixed(2), keywords: +keywords.toFixed(2), date: +date.toFixed(2) } };
}

export function findDuplicate(candidate, existingRows, { threshold = 0.65, windowDays = 7 } = {}) {
  let best = null;
  for (const row of existingRows) {
    const r = similarity(candidate, asCandidate(row), { windowDays });
    if (!r.blocked && r.score >= threshold && (!best || r.score > best.score)) best = { row, ...r };
  }
  return best;
}

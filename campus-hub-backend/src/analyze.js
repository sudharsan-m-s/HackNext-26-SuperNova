import { classify } from './classify.js';
import { extractAudience } from './audience.js';
import { cleanBody, normSubject, topKeywords } from './text.js';

const toISO = (d) => {
  const t = new Date(d ?? Date.now());
  return (Number.isNaN(t.getTime()) ? new Date() : t).toISOString();
};

// One email in, one structured update out (nothing is stored here).
export function analyze({ subject = '', body = '', date, sender = '' }) {
  const title = String(subject).replace(/\s+/g, ' ').trim() || '(no subject)';
  const cleaned = cleanBody(body);
  const { category, confidence, urgent } = classify(title, cleaned);
  return {
    title,
    body: cleaned,
    sender: String(sender).trim(),
    receivedAt: toISO(date),
    category,
    confidence,
    urgent,
    audience: extractAudience({ subject: title, body: cleaned }),
    keywords: topKeywords(title, cleaned),
    normSubject: normSubject(title),
  };
}

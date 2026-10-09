import { z } from 'zod';
import { analyze } from './analyze.js';
import { asCandidate, findDuplicate } from './dedupe.js';

export const emailSchema = z.object({
  id: z.string().min(1).max(200),
  from: z.string().max(500).default(''),
  subject: z.string().max(1000).default(''),
  body: z.string().max(200000).default(''),
  date: z.union([z.string(), z.number()]).optional(),
});
export const emailsSchema = z.array(emailSchema).min(1).max(200);

/**
 * Emails in -> consolidated updates in the store.
 *  1. validate        2. skip already-ingested message ids (idempotent)
 *  3. analyze (category, audience, keywords)
 *  4. duplicate? merge into existing update : create a new one
 */
export async function ingestEmails(rawEmails, { store, config, logger, source = 'gmail' }) {
  const startedAt = new Date().toISOString();
  const summary = { source, startedAt, fetched: rawEmails.length, created: 0, merged: 0, skipped: 0, failed: 0, items: [] };

  const emails = [];
  const seen = new Set();
  for (const raw of rawEmails) {
    const parsed = emailSchema.safeParse(raw);
    if (!parsed.success) {
      summary.failed++;
      summary.items.push({ id: raw?.id ?? null, status: 'invalid', reason: parsed.error.issues[0]?.message });
      logger.warn('email.invalid', { id: raw?.id, reason: parsed.error.issues[0]?.message });
    } else if (seen.has(parsed.data.id)) {
      summary.skipped++;
      summary.items.push({ id: parsed.data.id, status: 'skipped', reason: 'repeated id in batch' });
    } else { seen.add(parsed.data.id); emails.push(parsed.data); }
  }

  const known = await store.knownMessageIds(emails.map((e) => e.id));
  const fresh = [];
  for (const e of emails) {
    if (known.has(e.id)) { summary.skipped++; summary.items.push({ id: e.id, status: 'skipped', reason: 'already ingested' }); }
    else fresh.push({ e, a: analyze({ subject: e.subject, body: e.body, date: e.date, sender: e.from }) });
  }
  fresh.sort((x, y) => Date.parse(x.a.receivedAt) - Date.parse(y.a.receivedAt)); // oldest first = canonical

  const windowDays = config.DEDUPE_WINDOW_DAYS;
  const since = fresh.length ? new Date(Date.parse(fresh[0].a.receivedAt) - windowDays * 86400000).toISOString() : null;
  const recent = since ? await store.getRecentUpdates(since) : [];

  for (const { e, a } of fresh) {
    try {
      const dup = findDuplicate(asCandidate(a), recent, { threshold: config.DEDUPE_THRESHOLD, windowDays });
      if (dup) {
        const row = dup.row;
        await store.addSource({ update_id: row.id, message_id: e.id, sender: a.sender, subject: a.title, received_at: a.receivedAt, similarity: dup.score, is_primary: false });
        const newest = Math.max(Date.parse(row.last_seen_at || row.received_at), Date.parse(a.receivedAt));
        const patch = { duplicate_count: (row.duplicate_count || 1) + 1, last_seen_at: new Date(newest).toISOString(), urgent: Boolean(row.urgent || a.urgent) };
        await store.mergeInto(row.id, patch);
        Object.assign(row, patch);
        summary.merged++;
        summary.items.push({ id: e.id, status: 'merged', updateId: row.id, into: row.title, score: dup.score, category: row.tag });
        logger.info('update.merged', { messageId: e.id, updateId: row.id, score: dup.score });
      } else {
        const row = await store.insertUpdate({
          tag: a.category, title: a.title, body: a.body, sender: a.sender,
          received_at: a.receivedAt, last_seen_at: a.receivedAt, audience: a.audience,
          keywords: a.keywords, urgent: a.urgent, norm_subject: a.normSubject, duplicate_count: 1, source,
        });
        await store.addSource({ update_id: row.id, message_id: e.id, sender: a.sender, subject: a.title, received_at: a.receivedAt, similarity: 1, is_primary: true });
        recent.push(row);
        summary.created++;
        summary.items.push({ id: e.id, status: 'created', updateId: row.id, title: a.title, category: a.category, audience: a.audience, urgent: a.urgent });
        logger.info('update.created', { messageId: e.id, updateId: row.id, category: a.category });
      }
    } catch (err) {
      summary.failed++;
      summary.items.push({ id: e.id, status: 'failed', reason: err.message });
      logger.error('email.failed', { messageId: e.id, message: err.message });
    }
  }

  summary.finishedAt = new Date().toISOString();
  try {
    await store.recordRun({
      source, started_at: summary.startedAt, finished_at: summary.finishedAt, fetched: summary.fetched,
      created: summary.created, merged: summary.merged, skipped: summary.skipped, failed: summary.failed,
      status: summary.failed ? 'partial' : 'ok',
    });
  } catch (err) { logger.warn('run.record_failed', { message: err.message }); }
  logger.info('ingest.done', { created: summary.created, merged: summary.merged, skipped: summary.skipped, failed: summary.failed });
  return summary;
}

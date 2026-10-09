import { readFile } from 'node:fs/promises';
import { gmail as gmailApi, auth } from '@googleapis/gmail';
import { htmlToText } from './text.js';

export class GmailError extends Error {
  constructor(message, cause) { super(message); this.name = 'GmailError'; this.cause = cause; }
}

const header = (headers = [], name) => headers.find((h) => h.name.toLowerCase() === name)?.value || '';
const decode = (data) => Buffer.from(data.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');

// Walk the MIME tree; prefer text/plain, fall back to stripped HTML.
function extractBody(payload) {
  let text = '', html = '';
  (function walk(p) {
    if (!p) return;
    if (p.body?.data) {
      if (p.mimeType === 'text/plain') text += decode(p.body.data) + '\n';
      else if (p.mimeType === 'text/html') html += decode(p.body.data) + '\n';
    }
    (p.parts || []).forEach(walk);
  })(payload);
  return text.trim() ? text.trim() : htmlToText(html);
}

export function parseMessage(msg) {
  const h = msg.payload?.headers || [];
  const headerDate = new Date(header(h, 'date'));
  const date = Number.isNaN(headerDate.getTime()) ? new Date(Number(msg.internalDate)) : headerDate;
  return { id: msg.id, from: header(h, 'from'), subject: header(h, 'subject'), body: extractBody(msg.payload), date: date.toISOString() };
}

async function withRetry(fn, tries = 3) {
  for (let i = 1; ; i++) {
    try { return await fn(); } catch (err) {
      const status = err.code || err.response?.status;
      if (i >= tries || ![429, 500, 502, 503].includes(Number(status))) throw err;
      await new Promise((r) => setTimeout(r, 400 * 2 ** i));
    }
  }
}

async function fetchFromGmail(config, logger) {
  const oauth = new auth.OAuth2(config.GMAIL_CLIENT_ID, config.GMAIL_CLIENT_SECRET);
  oauth.setCredentials({ refresh_token: config.GMAIL_REFRESH_TOKEN });
  const gmail = gmailApi({ version: 'v1', auth: oauth });
  try {
    const list = await withRetry(() => gmail.users.messages.list({ userId: 'me', q: config.GMAIL_QUERY, maxResults: config.GMAIL_MAX_RESULTS }));
    const ids = (list.data.messages || []).map((m) => m.id);
    logger.info('gmail.listed', { count: ids.length, query: config.GMAIL_QUERY });
    const out = [];
    for (let i = 0; i < ids.length; i += 5) {
      const chunk = await Promise.all(ids.slice(i, i + 5).map((id) =>
        withRetry(() => gmail.users.messages.get({ userId: 'me', id, format: 'full' })).then((r) => parseMessage(r.data))));
      out.push(...chunk);
    }
    return out;
  } catch (err) {
    throw new GmailError(`Gmail request failed: ${err.message}`, err);
  }
}

async function fetchFromFixture(logger) {
  const raw = await readFile(new URL('../fixtures/emails.json', import.meta.url), 'utf8');
  const emails = JSON.parse(raw);
  logger.info('gmail.fixture', { count: emails.length });
  return emails;
}

// Returns [{ id, from, subject, body, date }]
export async function fetchEmails(config, logger) {
  return config.GMAIL_MODE === 'gmail' ? fetchFromGmail(config, logger) : fetchFromFixture(logger);
}

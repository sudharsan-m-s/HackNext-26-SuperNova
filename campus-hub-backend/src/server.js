import 'dotenv/config';
import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';
import express from 'express';
import cors from 'cors';
import { z, ZodError } from 'zod';
import { loadConfig } from './config.js';
import { createLogger } from './logger.js';
import { createStore } from './store/index.js';
import { fetchEmails as defaultFetch } from './gmail.js';
import { ingestEmails, emailsSchema } from './pipeline.js';
import { analyze } from './analyze.js';
import { isRelevant } from './audience.js';
import { asCandidate, similarity } from './dedupe.js';
import { CATEGORIES } from './classify.js';
import { resolveWeekday, scheduleVisibleTo, scheduleView, taskVisibleTo, taskView, broadcastVisibleTo, broadcastView, scopeFor } from './classwork.js';

export class AppError extends Error {
  constructor(status, code, message) { super(message); this.status = status; this.code = code; }
}
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

export function createApp({ store, config, logger, fetchEmails = defaultFetch }) {
  const app = express();
  app.disable('x-powered-by');
  app.use(cors({ origin: config.CORS_ORIGIN === '*' ? true : config.CORS_ORIGIN.split(',') }));
  app.use(express.json({ limit: '1mb' }));
  app.use((req, res, next) => {
    const t = Date.now();
    res.on('finish', () => logger.info('http', { method: req.method, path: req.path, status: res.statusCode, ms: Date.now() - t }));
    next();
  });

  // ---- auth ----
  const admin = (req, _res, next) => {
    const given = Buffer.from(String(req.get('x-admin-key') || ''));
    const want = Buffer.from(config.ADMIN_API_KEY);
    if (given.length !== want.length || !crypto.timingSafeEqual(given, want)) return next(new AppError(401, 'UNAUTHORIZED', 'Missing or invalid x-admin-key'));
    next();
  };
  const user = wrap(async (req, _res, next) => {
    const uid = await store.authenticate(req);
    if (!uid) throw new AppError(401, 'UNAUTHORIZED', 'Sign in required');
    const profile = await store.getProfile(uid);
    if (!profile) throw new AppError(403, 'NO_PROFILE', 'No profile found for this account');
    req.profile = profile;
    next();
  });

  // ---- ingest (operations 1 + 3) ----
  let running = false;
  async function runGmailIngest() {
    if (running) throw new AppError(409, 'INGEST_RUNNING', 'An ingest run is already in progress');
    running = true;
    try {
      const emails = await fetchEmails(config, logger);
      return await ingestEmails(emails, { store, config, logger, source: config.GMAIL_MODE });
    } finally { running = false; }
  }
  app.locals.runGmailIngest = runGmailIngest;

  app.get('/health', (_req, res) => res.json({ ok: true, store: store.kind, gmailMode: config.GMAIL_MODE, features: ['updates', 'schedule', 'tasks', 'broadcasts'] }));

  app.post('/api/ingest/gmail', admin, wrap(async (_req, res) => res.json(await runGmailIngest())));

  app.post('/api/ingest/emails', admin, wrap(async (req, res) => {
    const { emails } = z.object({ emails: emailsSchema }).parse(req.body);
    if (running) throw new AppError(409, 'INGEST_RUNNING', 'An ingest run is already in progress');
    running = true;
    try { res.json(await ingestEmails(emails, { store, config, logger, source: 'api' })); } finally { running = false; }
  }));

  app.get('/api/ingest/runs', admin, wrap(async (_req, res) => res.json({ data: await store.listRuns(10) })));

  // ---- relevance engine (operation 2) ----
  const listQuery = z.object({
    category: z.enum(CATEGORIES).optional(),
    unread: z.enum(['true', 'false']).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(30),
  });

  app.get('/api/updates', user, wrap(async (req, res) => {
    const q = listQuery.parse(req.query);
    const { profile } = req;
    const rows = await store.listUpdates({ limit: 300 });
    const relevant = rows.filter((r) => isRelevant(r.audience, profile));
    const read = await store.getReadIds(profile.id);
    let picked = relevant
      .filter((r) => !q.category || r.tag === q.category)
      .filter((r) => q.unread !== 'true' || !read.has(r.id))
      .slice(0, q.limit);
    const sources = await store.listSources(picked.map((r) => r.id));
    res.json({
      data: picked.map((r) => ({
        id: r.id,
        title: r.title,
        body: r.body,
        category: r.tag,
        sender: r.sender || null,
        receivedAt: r.received_at || r.created_at,
        urgent: Boolean(r.urgent),
        duplicateCount: r.duplicate_count || 1,
        alsoSentBy: (sources.get(r.id) || []).filter((s) => !s.is_primary).map((s) => ({ sender: s.sender, subject: s.subject, receivedAt: s.received_at })),
        read: read.has(r.id),
      })),
      meta: { returned: picked.length, relevantTotal: relevant.length, viewer: { name: profile.name, role: profile.role, dept: profile.dept, year: profile.year, section: profile.section } },
    });
  }));

  app.post('/api/updates/:id/read', user, wrap(async (req, res) => {
    const id = z.coerce.number().int().positive().parse(req.params.id);
    await store.markRead(req.profile.id, id);
    res.json({ ok: true });
  }));

  // ---- class work: timetable, tasks, broadcasts (always filtered to the signed-in person) ----
  const facultyOnly = (req, _res, next) => (req.profile.role === 'faculty' ? next() : next(new AppError(403, 'FORBIDDEN', 'Faculty only')));
  const studentOnly = (req, _res, next) => (req.profile.role === 'student' ? next() : next(new AppError(403, 'FORBIDDEN', 'Students only')));

  app.get('/api/schedule', user, wrap(async (req, res) => {
    const { weekday: asked } = z.object({ weekday: z.coerce.number().int().min(1).max(7).optional() }).parse(req.query);
    const { weekday, fallback } = resolveWeekday(asked);
    const rows = (await store.listSchedule(weekday)).filter((r) => scheduleVisibleTo(r, req.profile));
    res.json({ data: rows.map(scheduleView), meta: { weekday, weekendFallback: fallback } });
  }));

  app.get('/api/tasks', user, wrap(async (req, res) => {
    const done = req.profile.role === 'student' ? await store.getSubmittedTaskIds(req.profile.id) : new Set();
    const rows = (await store.listTasks()).filter((t) => taskVisibleTo(t, req.profile));
    res.json({ data: rows.map((t) => taskView(t, done.has(t.id))) });
  }));

  const newTask = z.object({
    title: z.string().trim().min(1).max(200),
    kind: z.enum(['assignment', 'form']),
    marks: z.coerce.number().int().min(0).max(100).default(0),
    due: z.string().trim().min(1).max(40).default('Next week'),
    fields: z.array(z.string().trim().min(1).max(80)).min(1).max(10).default(['Response']),
    year: z.coerce.number().int().min(2).max(3),
  });
  app.post('/api/tasks', user, facultyOnly, wrap(async (req, res) => {
    const b = newTask.parse(req.body);
    const { profile } = req;
    const row = await store.insertTask({ author: profile.id, dept: profile.dept, year: b.year, section: `${profile.dept}-A`, title: b.title, kind: b.kind, marks: b.marks, due: b.due, fields: b.fields });
    res.status(201).json({ data: taskView(row, false) });
  }));

  app.post('/api/tasks/:id/submit', user, studentOnly, wrap(async (req, res) => {
    const id = z.coerce.number().int().positive().parse(req.params.id);
    const task = await store.getTask(id);
    if (!task || !taskVisibleTo(task, req.profile)) throw new AppError(404, 'NOT_FOUND', 'Task not found');
    await store.markTaskSubmitted(req.profile.id, id);
    res.json({ ok: true });
  }));

  app.get('/api/broadcasts', user, wrap(async (req, res) => {
    const rows = (await store.listBroadcasts()).filter((b) => broadcastVisibleTo(b, req.profile));
    res.json({ data: rows.slice(0, 100).map(broadcastView) });
  }));

  const newBroadcast = z.object({
    audience: z.enum(['college', 'department', 'class']),
    year: z.coerce.number().int().min(2).max(3).optional(),
    title: z.string().trim().min(1).max(200),
    body: z.string().trim().min(1).max(5000),
  }).refine((b) => b.audience !== 'class' || b.year, { message: 'year is required when audience is class', path: ['year'] });
  app.post('/api/broadcasts', user, facultyOnly, wrap(async (req, res) => {
    const b = newBroadcast.parse(req.body);
    const row = await store.insertBroadcast({ author: req.profile.id, scope: scopeFor(b.audience, req.profile.dept, b.year), title: b.title, body: b.body });
    res.status(201).json({ data: broadcastView(row) });
  }));

  // ---- debug helpers: test operations 1-3 without touching the database ----
  const draft = z.object({ subject: z.string().min(1).max(1000), body: z.string().max(200000).default(''), date: z.string().optional() });

  app.post('/api/debug/analyze', admin, wrap(async (req, res) => {
    const input = draft.parse(req.body);
    const a = analyze(input);
    const profiles = await store.listProfiles();
    const { title, body, ...view } = a;
    res.json({
      ...view,
      title,
      visibleTo: profiles.filter((p) => isRelevant(a.audience, p)).map((p) => `${p.login_id} ${p.name}`),
      hiddenFrom: profiles.filter((p) => !isRelevant(a.audience, p)).map((p) => `${p.login_id} ${p.name}`),
    });
  }));

  app.post('/api/debug/similarity', admin, wrap(async (req, res) => {
    const { a, b } = z.object({ a: draft, b: draft }).parse(req.body);
    const r = similarity(asCandidate(analyze(a)), asCandidate(analyze(b)), { windowDays: config.DEDUPE_WINDOW_DAYS });
    res.json({ ...r, threshold: config.DEDUPE_THRESHOLD, wouldMerge: !r.blocked && r.score >= config.DEDUPE_THRESHOLD });
  }));

  // ---- errors ----
  app.use((req, _res, next) => next(new AppError(404, 'NOT_FOUND', `No route for ${req.method} ${req.path}`)));
  app.use((err, _req, res, _next) => {
    if (err instanceof ZodError) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid request', details: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })) } });
    }
    if (err.type === 'entity.parse.failed') return res.status(400).json({ error: { code: 'BAD_JSON', message: 'Request body is not valid JSON' } });
    if (err instanceof AppError) return res.status(err.status).json({ error: { code: err.code, message: err.message } });
    if (err.name === 'GmailError') {
      logger.error('gmail.failed', { message: err.message });
      return res.status(502).json({ error: { code: 'GMAIL_ERROR', message: err.message } });
    }
    logger.error('unhandled', { message: err.message, stack: err.stack });
    res.status(500).json({ error: { code: 'INTERNAL', message: 'Something went wrong' } });
  });
  return app;
}

function start() {
  const config = loadConfig();
  const logger = createLogger(config.LOG_LEVEL);
  if (config.ADMIN_API_KEY === 'dev-admin-key') logger.warn('ADMIN_API_KEY is the default dev value. Change it before deploying.');
  const store = createStore(config);
  const app = createApp({ store, config, logger });
  app.listen(config.PORT, () => logger.info('listening', { port: config.PORT, store: store.kind, gmailMode: config.GMAIL_MODE }));
  if (config.INGEST_INTERVAL_MIN > 0) {
    setInterval(() => app.locals.runGmailIngest().catch((e) => logger.error('scheduled_ingest_failed', { message: e.message })), config.INGEST_INTERVAL_MIN * 60000);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { start(); } catch (err) { console.error(`Startup failed: ${err.message}`); process.exit(1); }
}

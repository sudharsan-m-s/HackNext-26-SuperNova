import { z } from 'zod';

const schema = z.object({
  PORT: z.coerce.number().default(8787),
  CORS_ORIGIN: z.string().default('*'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  ADMIN_API_KEY: z.string().min(8).default('dev-admin-key'),

  STORE: z.enum(['memory', 'supabase']).optional(),
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20).optional(),

  GMAIL_MODE: z.enum(['fixture', 'gmail']).default('fixture'),
  GMAIL_CLIENT_ID: z.string().optional(),
  GMAIL_CLIENT_SECRET: z.string().optional(),
  GMAIL_REFRESH_TOKEN: z.string().optional(),
  GMAIL_QUERY: z.string().default('newer_than:14d'),
  GMAIL_MAX_RESULTS: z.coerce.number().int().min(1).max(100).default(25),

  DEDUPE_THRESHOLD: z.coerce.number().min(0.3).max(1).default(0.65),
  DEDUPE_WINDOW_DAYS: z.coerce.number().min(1).max(60).default(7),
  INGEST_INTERVAL_MIN: z.coerce.number().min(0).default(0),
});

// Treat empty strings in .env as "not set".
export function loadConfig(env = process.env) {
  const clean = Object.fromEntries(Object.entries(env).filter(([, v]) => v !== ''));
  const cfg = schema.parse(clean);
  cfg.STORE = cfg.STORE || (cfg.SUPABASE_URL ? 'supabase' : 'memory');
  if (cfg.STORE === 'supabase' && !(cfg.SUPABASE_URL && cfg.SUPABASE_SERVICE_ROLE_KEY)) {
    throw new Error('STORE=supabase needs SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  }
  if (cfg.GMAIL_MODE === 'gmail' && !(cfg.GMAIL_CLIENT_ID && cfg.GMAIL_CLIENT_SECRET && cfg.GMAIL_REFRESH_TOKEN)) {
    throw new Error('GMAIL_MODE=gmail needs GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET and GMAIL_REFRESH_TOKEN (run: npm run gmail:auth)');
  }
  return cfg;
}

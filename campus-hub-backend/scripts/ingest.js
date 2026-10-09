// One-off ingest from the command line (also handy for cron): npm run ingest
import 'dotenv/config';
import { loadConfig } from '../src/config.js';
import { createLogger } from '../src/logger.js';
import { createStore } from '../src/store/index.js';
import { fetchEmails } from '../src/gmail.js';
import { ingestEmails } from '../src/pipeline.js';

const config = loadConfig();
const logger = createLogger(config.LOG_LEVEL);
try {
  const emails = await fetchEmails(config, logger);
  const { items, ...totals } = await ingestEmails(emails, { store: createStore(config), config, logger, source: config.GMAIL_MODE });
  console.log(JSON.stringify(totals, null, 2));
} catch (err) {
  console.error('Ingest failed:', err.message);
  process.exit(1);
}

// Tiny JSON-lines logger. One line per event, easy to grep or ship to a log service.
const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 };

export function createLogger(level = 'info') {
  const min = LEVELS[level] ?? LEVELS.info;
  const emit = (lvl, msg, meta = {}) => {
    if (LEVELS[lvl] < min) return;
    const line = JSON.stringify({ t: new Date().toISOString(), level: lvl, msg, ...meta });
    (lvl === 'error' ? console.error : console.log)(line);
  };
  return {
    debug: (m, x) => emit('debug', m, x),
    info: (m, x) => emit('info', m, x),
    warn: (m, x) => emit('warn', m, x),
    error: (m, x) => emit('error', m, x),
  };
}

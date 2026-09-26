export const logger = {
  info(event, meta = {}) {
    console.log(JSON.stringify({ level: 'info', event, ...meta, ts: new Date().toISOString() }));
  },
  warn(event, meta = {}) {
    console.warn(JSON.stringify({ level: 'warn', event, ...meta, ts: new Date().toISOString() }));
  },
  error(event, meta = {}) {
    console.error(JSON.stringify({ level: 'error', event, ...meta, ts: new Date().toISOString() }));
  },
};

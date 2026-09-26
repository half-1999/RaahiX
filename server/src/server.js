import app from './app.js';
import { config } from './config/index.js';
import { connectDb } from './config/db.js';
import { logger } from './utils/logger.js';
import { startExpireHoldsJob } from './jobs/expireHolds.js';
import { User } from './models/User.js';
import { runSeed } from './scripts/runSeed.js';

async function maybeSeed() {
  const shouldSeed =
    process.env.SEED_ON_START === 'true' ||
    (config.useMemoryMongo && process.env.SEED_ON_START !== 'false');
  if (!shouldSeed) return;

  const count = await User.countDocuments();
  if (count > 0) return;

  logger.info('seed.auto_start', {});
  await runSeed({ connect: false, disconnect: false });
}

async function start() {
  await connectDb();
  await maybeSeed();
  app.listen(config.port, () => {
    logger.info('server.started', { port: config.port, env: config.env });
    if (config.env !== 'test') {
      startExpireHoldsJob();
    }
  });
}

start().catch((err) => {
  logger.error('server.failed', { message: err.message, stack: err.stack });
  process.exit(1);
});

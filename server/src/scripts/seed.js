import { runSeed } from './runSeed.js';
import { disconnectDb } from '../config/db.js';

runSeed({ connect: true, disconnect: true }).catch(async (err) => {
  console.error(err);
  try {
    await disconnectDb();
  } catch {
    // ignore
  }
  process.exit(1);
});

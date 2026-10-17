import { reconcileRideLifecycle } from '../services/rideLifecycleService.js';
import { logger } from '../utils/logger.js';

const INTERVAL_MS = 30_000;

let timer = null;

export function startRideLifecycleJob() {
  if (timer) return;

  const tick = async () => {
    try {
      await reconcileRideLifecycle();
    } catch (err) {
      logger.error('job.rideLifecycle_failed', { message: err.message });
    }
  };

  tick();
  timer = setInterval(tick, INTERVAL_MS);
  if (typeof timer.unref === 'function') timer.unref();
  logger.info('job.rideLifecycle_started', { intervalMs: INTERVAL_MS });
}

export function stopRideLifecycleJob() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}

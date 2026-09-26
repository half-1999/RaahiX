import { releaseExpiredHolds } from '../services/seatService.js';
import { expirePending } from '../services/bookingService.js';
import { logger } from '../utils/logger.js';

const INTERVAL_MS = 60_000;

let timer = null;

export function startExpireHoldsJob() {
  if (timer) return;

  const tick = async () => {
    try {
      const seats = await releaseExpiredHolds();
      const bookings = await expirePending();
      if (seats.seatsReleased > 0 || bookings.expired > 0) {
        logger.info('job.expireHolds', { ...seats, ...bookings });
      }
    } catch (err) {
      logger.error('job.expireHolds_failed', { message: err.message });
    }
  };

  // Run once shortly after start, then every 60s
  tick();
  timer = setInterval(tick, INTERVAL_MS);
  if (typeof timer.unref === 'function') timer.unref();
  logger.info('job.expireHolds_started', { intervalMs: INTERVAL_MS });
}

export function stopExpireHoldsJob() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}

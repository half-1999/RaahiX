/**
 * Transparent ride ranking for search discovery.
 * Weights are configurable; hard eligibility is applied by the caller before scoring.
 */

export const DEFAULT_RANKING_WEIGHTS = Object.freeze({
  departureTime: 0.4,
  routeMatch: 0.3,
  price: 0.15,
  seats: 0.1,
  quality: 0.05,
});

function clamp01(n) {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

/**
 * Score how close departure is to the requested calendar day midpoint (local-ish via UTC day).
 * Same-day rides score highest; earlier same-day slightly preferred over late evening.
 */
export function scoreDepartureTime(departureTime, requestedDate) {
  if (!departureTime || !requestedDate) return 0;
  const dep = new Date(departureTime);
  const day = new Date(requestedDate);
  day.setUTCHours(12, 0, 0, 0);
  const hoursDiff = Math.abs(dep.getTime() - day.getTime()) / (60 * 60 * 1000);
  // Within ~12h of midday → high; falls off by 24h
  return clamp01(1 - hoursDiff / 24);
}

/** Exact city pair = 1; nearby = 0.7; else 0. Caller must pass exact/nearby explicitly. */
export function scoreRouteMatch({ exact = false, nearby = false } = {}) {
  if (exact) return 1;
  if (nearby) return 0.7;
  return 0;
}

/** Prefer mid-range fares; extreme outliers score lower within the candidate set. */
export function scorePrice(price, { minPrice, maxPrice } = {}) {
  const p = Number(price) || 0;
  if (!(maxPrice > minPrice)) return 0.5;
  // Prefer lower prices within the band
  return clamp01(1 - (p - minPrice) / (maxPrice - minPrice));
}

export function scoreSeats(available, passengers = 1) {
  const open = Number(available) || 0;
  const need = Math.max(1, Number(passengers) || 1);
  if (open < need) return 0;
  // More open seats → slightly higher, capped
  return clamp01(0.55 + Math.min(open, 6) / 12);
}

/** Only use real quality signals; missing rating → neutral 0.5 (never invent). */
export function scoreQuality({ rating = null, reviewCount = 0 } = {}) {
  if (rating == null || !reviewCount) return 0.5;
  return clamp01(Number(rating) / 5);
}

export function combineScores(parts, weights = DEFAULT_RANKING_WEIGHTS) {
  const w = { ...DEFAULT_RANKING_WEIGHTS, ...weights };
  const totalW =
    w.departureTime + w.routeMatch + w.price + w.seats + w.quality || 1;
  const raw =
    (parts.departureTime || 0) * w.departureTime +
    (parts.routeMatch || 0) * w.routeMatch +
    (parts.price || 0) * w.price +
    (parts.seats || 0) * w.seats +
    (parts.quality || 0) * w.quality;
  return Math.round((raw / totalW) * 1000) / 1000;
}

export function scoreRide(ride, ctx = {}) {
  const {
    requestedDate,
    passengers = 1,
    minPrice,
    maxPrice,
    exactRoute = true,
    nearbyRoute = false,
    weights,
  } = ctx;
  const parts = {
    departureTime: scoreDepartureTime(ride.departureTime, requestedDate),
    routeMatch: scoreRouteMatch({ exact: exactRoute, nearby: nearbyRoute }),
    price: scorePrice(ride.pricePerSeat ?? ride.price, { minPrice, maxPrice }),
    seats: scoreSeats(ride.segmentSeats ?? ride.availableSeats, passengers),
    quality: scoreQuality({ rating: ride.rating, reviewCount: ride.reviewCount }),
  };
  return { score: combineScores(parts, weights), parts };
}

/**
 * Sort genuine (or mixed) bookable rides. Demo rides always sort after genuine when both present.
 * sortMode: recommended | price | departure | availability
 */
export function rankRides(rides, ctx = {}) {
  const { sortMode = 'recommended', passengers = 1 } = ctx;
  const prices = rides.map((r) => Number(r.pricePerSeat ?? r.price) || 0).filter((p) => p > 0);
  const minPrice = prices.length ? Math.min(...prices) : 0;
  const maxPrice = prices.length ? Math.max(...prices) : 0;

  const enriched = rides.map((ride) => {
    const { score, parts } = scoreRide(ride, { ...ctx, minPrice, maxPrice, passengers });
    return { ...ride, rankingScore: score, rankingParts: parts };
  });

  enriched.sort((a, b) => {
    const aDemo = Boolean(a.isDemo);
    const bDemo = Boolean(b.isDemo);
    if (aDemo !== bDemo) return aDemo ? 1 : -1;

    if (sortMode === 'price') {
      return (a.pricePerSeat || 0) - (b.pricePerSeat || 0) || a.rankingScore - b.rankingScore;
    }
    if (sortMode === 'departure') {
      return new Date(a.departureTime) - new Date(b.departureTime);
    }
    if (sortMode === 'availability') {
      const sa = Number(a.segmentSeats ?? a.availableSeats) || 0;
      const sb = Number(b.segmentSeats ?? b.availableSeats) || 0;
      return sb - sa || new Date(a.departureTime) - new Date(b.departureTime);
    }
    // recommended: score desc, then earlier departure
    if (b.rankingScore !== a.rankingScore) return b.rankingScore - a.rankingScore;
    return new Date(a.departureTime) - new Date(b.departureTime);
  });

  return enriched;
}

/** Demo rides ranked separately — never mixed into genuine ranking lists. */
export function rankDemoRides(rides, ctx = {}) {
  return rankRides(
    rides.map((r) => ({ ...r, isDemo: true })),
    { ...ctx, sortMode: ctx.sortMode || 'departure' }
  );
}

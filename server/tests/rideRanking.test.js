import {
  combineScores,
  rankRides,
  scoreDepartureTime,
  scorePrice,
  scoreRouteMatch,
  scoreSeats,
} from '../src/services/rideRankingService.js';

describe('rideRankingService', () => {
  test('exact route outranks nearby', () => {
    expect(scoreRouteMatch({ exact: true })).toBeGreaterThan(scoreRouteMatch({ nearby: true }));
  });

  test('departure score prefers midday of requested day', () => {
    const day = '2026-10-18';
    const morning = scoreDepartureTime('2026-10-18T08:00:00.000Z', day);
    const nextDay = scoreDepartureTime('2026-10-19T08:00:00.000Z', day);
    expect(morning).toBeGreaterThan(nextDay);
  });

  test('seat score is zero when under capacity', () => {
    expect(scoreSeats(0, 1)).toBe(0);
    expect(scoreSeats(2, 1)).toBeGreaterThan(0);
  });

  test('price prefers lower within band', () => {
    expect(scorePrice(500, { minPrice: 400, maxPrice: 1000 })).toBeGreaterThan(
      scorePrice(900, { minPrice: 400, maxPrice: 1000 })
    );
  });

  test('combineScores respects weights', () => {
    const high = combineScores(
      { departureTime: 1, routeMatch: 1, price: 1, seats: 1, quality: 1 },
      { departureTime: 1, routeMatch: 0, price: 0, seats: 0, quality: 0 }
    );
    const low = combineScores(
      { departureTime: 0, routeMatch: 1, price: 1, seats: 1, quality: 1 },
      { departureTime: 1, routeMatch: 0, price: 0, seats: 0, quality: 0 }
    );
    expect(high).toBeGreaterThan(low);
  });

  test('rankRides keeps demo after genuine and never lets full outrank available', () => {
    const ranked = rankRides(
      [
        {
          id: 'demo-cheap',
          isDemo: true,
          pricePerSeat: 100,
          departureTime: '2026-10-18T06:00:00.000Z',
          availableSeats: 4,
          segmentSeats: 4,
        },
        {
          id: 'genuine',
          isDemo: false,
          pricePerSeat: 900,
          departureTime: '2026-10-18T18:00:00.000Z',
          availableSeats: 1,
          segmentSeats: 1,
        },
      ],
      { requestedDate: '2026-10-18', passengers: 1, sortMode: 'recommended' }
    );
    expect(ranked[0].id).toBe('genuine');
    expect(ranked[1].id).toBe('demo-cheap');
  });

  test('sort by price', () => {
    const ranked = rankRides(
      [
        { id: 'a', pricePerSeat: 800, departureTime: '2026-10-18T10:00:00.000Z', segmentSeats: 2 },
        { id: 'b', pricePerSeat: 500, departureTime: '2026-10-18T12:00:00.000Z', segmentSeats: 2 },
      ],
      { requestedDate: '2026-10-18', sortMode: 'price' }
    );
    expect(ranked.map((r) => r.id)).toEqual(['b', 'a']);
  });
});

import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { BadgeCheck, CalendarDays, MapPin, ShieldCheck, Ticket } from 'lucide-react';
import { rideService } from '../../services/rideService';
import RideSearchForm from '../../components/rides/RideSearchForm';
import RideCard from '../../components/rides/RideCard';
import Button from '../../components/ui/Button';
import EmptyState from '../../components/ui/EmptyState';
import Skeleton from '../../components/ui/Skeleton';
import { cityLabel, todayISODate } from '../../utils/format';

const steps = [
  { n: '01', title: 'Find a ride', body: 'Choose pickup, drop, date, and how many seats you need.' },
  { n: '02', title: 'Choose your seat', body: 'See the cabin and hold the seats that are actually open.' },
  { n: '03', title: 'Pay and confirm', body: 'Pay the driver, upload the screenshot, and wait for approval.' },
];

function RideRail({ title, rides, empty }) {
  if (!rides) {
    return (
      <div className="mt-6 space-y-3">
        <Skeleton className="h-36 w-full" />
        <Skeleton className="h-36 w-full" />
      </div>
    );
  }
  if (!rides.length) {
    return (
      <EmptyState
        icon={Ticket}
        title={empty}
        description="Published rides for this window will show up here."
        action={
          <Link to="/search">
            <Button size="sm" variant="outline">Explore other routes</Button>
          </Link>
        }
      />
    );
  }
  return (
    <div className="mt-6 grid gap-4">
      {rides.map((ride) => (
        <RideCard key={ride.id} ride={ride} />
      ))}
    </div>
  );
}

export default function HomePage() {
  const navigate = useNavigate();
  const catalogQuery = useQuery({
    queryKey: ['rides', 'catalog'],
    queryFn: () => rideService.catalog(),
  });
  const featuredStops = (catalogQuery.data?.today?.[0] || catalogQuery.data?.upcoming?.[0])?.rideStops || [];

  const openRoute = (from, to) => {
    const params = new URLSearchParams({
      originCity: from,
      destinationCity: to,
      date: todayISODate(),
      passengers: '1',
    });
    navigate(`/search?${params.toString()}`);
  };

  return (
    <div>
      <section className="border-b border-line bg-ivory">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 md:grid-cols-[1.1fr_0.9fr] md:py-16">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-coral">Scheduled intercity shared rides</p>
            <h1 className="mt-3 font-display text-5xl font-bold leading-none text-navy md:text-6xl">RaahiX</h1>
            <p className="mt-3 font-display text-2xl text-navy">Shehar Se Shehar, Saath Safar.</p>
            <p className="mt-4 max-w-xl text-base text-slate">
              Discover scheduled intercity shared rides, choose your pickup and drop, book available seats, and travel together.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/search"><Button>Find a ride</Button></Link>
              <Link to="/register/driver"><Button variant="outline">Publish a ride</Button></Link>
            </div>
            <p className="mt-6 text-xs text-slate">A product by The Stack Guy</p>
          </div>
          <RideSearchForm />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12">
        <h2 className="font-display text-3xl font-bold text-navy">How it works</h2>
        <ol className="mt-6 grid gap-4 md:grid-cols-3">
          {steps.map((step) => (
            <li key={step.n} className="border-t-2 border-navy pt-4">
              <p className="text-xs font-bold tracking-[0.16em] text-coral">{step.n}</p>
              <h3 className="mt-2 font-display text-xl font-bold text-navy">{step.title}</h3>
              <p className="mt-2 text-sm text-slate">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="border-y border-line bg-white">
        <div className="mx-auto max-w-6xl px-4 py-12">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-brand" />
            <h2 className="font-display text-3xl font-bold text-navy">Available today</h2>
          </div>
          {catalogQuery.isError ? <p className="mt-4 text-sm text-danger">Unable to load rides. Try again in a moment.</p> : null}
          <RideRail title="Today" rides={catalogQuery.isLoading ? null : catalogQuery.data?.today} empty="No rides available for today yet." />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12">
        <h2 className="font-display text-3xl font-bold text-navy">Upcoming rides</h2>
        <RideRail rides={catalogQuery.isLoading ? null : catalogQuery.data?.upcoming} empty="No upcoming rides are published yet." />
      </section>

      <section className="border-y border-line bg-ivory">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 md:grid-cols-2">
          <div>
            <h2 className="font-display text-3xl font-bold text-navy">Active routes</h2>
            <p className="mt-2 text-sm text-slate">Taken from rides that are actually published.</p>
            <div className="mt-6 space-y-3">
              {(catalogQuery.data?.routes || []).map((route) => (
                <button
                  key={`${route.from}-${route.to}`}
                  type="button"
                  onClick={() => openRoute(route.from, route.to)}
                  className="flex w-full items-center justify-between border border-line bg-white px-4 py-3 text-left"
                >
                  <span className="font-semibold text-navy">{route.from} → {route.to}</span>
                  <span className="text-sm text-slate">{route.rides} ride{route.rides === 1 ? '' : 's'}</span>
                </button>
              ))}
              {!catalogQuery.isLoading && !(catalogQuery.data?.routes || []).length ? (
                <p className="text-sm text-slate">No active routes yet.</p>
              ) : null}
            </div>
          </div>
          <div>
            <h2 className="font-display text-3xl font-bold text-navy">On the road</h2>
            <ol className="mt-6 space-y-0">
              {featuredStops.map((stop, index) => (
                <li key={`${stop.city}-${stop.sequence || index}`} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <span className="mt-1 h-3 w-3 rounded-full bg-coral" />
                    {index < featuredStops.length - 1 ? <span className="w-px flex-1 bg-line" /> : null}
                  </div>
                  <div className="pb-5">
                    <p className="font-semibold text-navy">{cityLabel(stop.city || stop.name)}</p>
                    <p className="text-xs text-slate">{stop.name}</p>
                  </div>
                </li>
              ))}
              {!featuredStops.length ? (
                <p className="text-sm text-slate">A published multi-stop ride will draw its stops here.</p>
              ) : null}
            </ol>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-6 px-4 py-12 md:grid-cols-3">
        {[
          { icon: MapPin, title: 'Scheduled travel', body: 'Departures are published in advance. You book a seat, not a live taxi.' },
          { icon: BadgeCheck, title: 'Verified drivers', body: 'A driver publishes rides only after verification.' },
          { icon: ShieldCheck, title: 'Clear payment', body: 'You pay the driver directly and the booking confirms after the screenshot is approved.' },
        ].map((item) => (
          <article key={item.title}>
            <item.icon className="h-5 w-5 text-brand" />
            <h3 className="mt-3 font-display text-xl font-bold text-navy">{item.title}</h3>
            <p className="mt-2 text-sm text-slate">{item.body}</p>
          </article>
        ))}
      </section>

      <section className="bg-navy text-white">
        <div className="mx-auto flex max-w-6xl flex-col items-start gap-4 px-4 py-14 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="font-display text-3xl font-bold">Your next journey is waiting.</h2>
            <p className="mt-2 text-sm text-white/70">Shehar Se Shehar, Saath Safar.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link to="/search"><Button>Find a ride</Button></Link>
            <Link to="/register/driver"><Button variant="outline" className="border-white text-white">Publish a ride</Button></Link>
          </div>
        </div>
      </section>
    </div>
  );
}

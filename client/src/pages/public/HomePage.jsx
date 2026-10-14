import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown } from 'lucide-react';
import { rideService } from '../../services/rideService';
import RideSearchForm from '../../components/rides/RideSearchForm';
import Button from '../../components/ui/Button';
import { todayISODate } from '../../utils/format';

const steps = [
  {
    title: 'Search your route',
    body: 'Choose the cities, the date, and how many seats you need.',
  },
  {
    title: 'Compare scheduled rides',
    body: 'Look at the published departure, the seat price, and which seats are still open.',
  },
  {
    title: 'Book the seats',
    body: 'Pick a pickup and a drop, then hold the seats that are actually available.',
  },
];

const faqs = [
  {
    q: 'What is RaahiX?',
    a: 'RaahiX is a scheduled intercity shared-ride marketplace. Independent drivers publish their own rides. Passengers search those rides and book open seats. It is not an instant taxi, a central dispatch service, or live driver tracking.',
  },
  {
    q: 'How do I find a scheduled shared ride?',
    a: 'Use From, To, travel date, and passenger count. The city list comes from locations already in RaahiX. Search opens the rides published for that route and date.',
  },
  {
    q: 'Can I choose how many seats to book?',
    a: 'Yes. Set the passenger count in search, from 1 to 6. On the ride, you select that many open seats. You cannot select more seats than the passenger count, and the booking stops if fewer seats are left.',
  },
  {
    q: 'How do I know which rides are available?',
    a: 'Search shows rides that are published for your route and date. On a ride, the seat map marks booked seats as unavailable and leaves open seats selectable.',
  },
  {
    q: 'How can I publish a ride as a driver?',
    a: 'Register as a car owner, then create the ride from the driver area. A new driver starts pending review. Publishing is available once that account is allowed to publish.',
  },
  {
    q: 'Is RaahiX an instant taxi-booking service?',
    a: 'No. RaahiX lists scheduled intercity shared rides. You choose a published departure. There is no live hailing and no driver tracking on the map.',
  },
  {
    q: 'How are bookings and payments handled?',
    a: 'You pay the driver directly by the UPI or QR details on your booking, then upload a screenshot. The booking is confirmed after the driver approves that proof. RaahiX records the payment. It does not charge a card, and it does not send refunds automatically. If a booking is cancelled, the app records a refund obligation based on how close the departure is.',
  },
];

function FaqList() {
  const [open, setOpen] = useState(0);
  return (
    <div className="divide-y divide-line border-y border-line">
      {faqs.map((item, index) => {
        const expanded = open === index;
        const panelId = `faq-panel-${index}`;
        return (
          <div key={item.q}>
            <button
              type="button"
              className="flex w-full items-center justify-between gap-4 py-4 text-left text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-dark"
              aria-expanded={expanded}
              aria-controls={panelId}
              onClick={() => setOpen(expanded ? -1 : index)}
            >
              <span className="font-display text-lg font-semibold">{item.q}</span>
              <ChevronDown className={`h-5 w-5 shrink-0 text-slate ${expanded ? 'rotate-180' : ''}`} />
            </button>
            <div id={panelId} role="region" hidden={!expanded} className="pb-4">
              <p className="max-w-[65ch] text-sm leading-relaxed text-slate">{item.a}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function HomePage() {
  const navigate = useNavigate();
  const catalogQuery = useQuery({
    queryKey: ['rides', 'catalog'],
    queryFn: () => rideService.catalog(),
  });
  const routes = catalogQuery.data?.routes || [];

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
      <section className="border-b border-line bg-white">
        <div className="mx-auto grid max-w-6xl items-start gap-10 px-4 py-12 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] md:py-16">
          <div className="min-w-0 max-w-xl pt-2">
            <p className="text-sm font-medium text-slate">Scheduled intercity shared rides</p>
            <h1 className="mt-3 font-display text-3xl font-semibold leading-tight tracking-[-0.03em] text-ink text-balance sm:text-4xl">
              Your next city is closer than you think.
            </h1>
            <p className="mt-4 max-w-[42ch] text-base leading-relaxed text-slate">
              Find a published ride between cities, choose the seats you need, and travel on a schedule you can plan around.
            </p>
          </div>
          <div className="min-w-0 border border-line bg-white p-4 shadow-[var(--shadow-soft)] md:p-5">
            <h2 className="font-display text-lg font-semibold text-ink">Search available rides</h2>
            <p className="mt-1 text-sm text-slate">Cities come from the locations already listed in RaahiX.</p>
            <div className="mt-4">
              <RideSearchForm bare actionBelow submitLabel="Search available rides" />
            </div>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="scroll-mt-20 mx-auto max-w-6xl px-4 py-14">
        <h2 className="font-display text-2xl font-semibold text-ink">How it works</h2>
        <ol className="mt-6 divide-y divide-line border-y border-line">
          {steps.map((step, index) => (
            <li key={step.title} className="grid gap-2 py-5 sm:grid-cols-[4rem_1fr] sm:items-baseline">
              <p className="text-sm font-semibold text-brand-dark">0{index + 1}</p>
              <div>
                <h3 className="font-display text-lg font-semibold text-ink">{step.title}</h3>
                <p className="mt-1 max-w-[52ch] text-sm leading-relaxed text-slate">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="border-y border-line bg-white">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <h2 className="font-display text-2xl font-semibold text-ink">Published routes</h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate">
            These are routes with a ride on the schedule. A search opens that pair for today.
          </p>
          {catalogQuery.isLoading ? <p className="mt-6 text-sm text-slate">Loading routes…</p> : null}
          {catalogQuery.isError ? (
            <p className="mt-6 text-sm text-danger" role="alert">
              Routes could not be loaded. You can still search from the form above.
            </p>
          ) : null}
          {!catalogQuery.isLoading && !catalogQuery.isError && routes.length ? (
            <ul className="mt-6 divide-y divide-line border-y border-line">
              {routes.map((route) => (
                <li key={`${route.from}-${route.to}`}>
                  <button
                    type="button"
                    onClick={() => openRoute(route.from, route.to)}
                    className="flex w-full items-center justify-between gap-4 py-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-dark"
                  >
                    <span className="font-medium text-ink">
                      {route.from} to {route.to}
                    </span>
                    <span className="text-sm text-slate">
                      {route.rides} ride{route.rides === 1 ? '' : 's'}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          {!catalogQuery.isLoading && !catalogQuery.isError && !routes.length ? (
            <p className="mt-6 max-w-xl text-sm leading-relaxed text-slate">
              No routes are published right now. When a driver lists a ride, its cities will appear here.
            </p>
          ) : null}
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-10 px-4 py-14 md:grid-cols-2">
        <div>
          <h2 className="font-display text-2xl font-semibold text-ink">Why this is different from a taxi</h2>
          <p className="mt-3 max-w-[48ch] text-sm leading-relaxed text-slate">
            You book a seat on a ride that already has a departure time. You can compare the options for your route, and you choose from the seats that are still open. Drivers publish and manage their own rides.
          </p>
        </div>
        <div id="for-drivers" className="scroll-mt-20">
          <h2 className="font-display text-2xl font-semibold text-ink">Driving that route anyway?</h2>
          <p className="mt-3 max-w-[48ch] text-sm leading-relaxed text-slate">
            Publish the journey, set the seat price, and let passengers book the seats you still have.
          </p>
          <Link to="/register/driver" className="mt-5 inline-block">
            <Button>Offer a ride</Button>
          </Link>
        </div>
      </section>

      <section className="border-t border-line bg-white">
        <div className="mx-auto max-w-3xl px-4 py-14">
          <h2 className="font-display text-2xl font-semibold text-ink">Questions</h2>
          <div className="mt-4">
            <FaqList />
          </div>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link to="/search">
              <Button className="w-full sm:w-auto">Find a ride</Button>
            </Link>
            <a href="#how-it-works">
              <Button variant="outline" className="w-full sm:w-auto">
                How it works
              </Button>
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}

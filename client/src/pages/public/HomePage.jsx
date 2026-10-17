import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Autoplay from 'embla-carousel-autoplay';
import {
  ArrowRight,
  Armchair,
  CarFront,
  Clock3,
  MapPinned,
  Minus,
  Plus,
  Quote,
  Search,
  Star,
  Users,
} from 'lucide-react';
import { rideService } from '../../services/rideService';
import RideSearchForm from '../../components/rides/RideSearchForm';
import Button from '../../components/ui/Button';
import { Avatar, AvatarFallback, AvatarImage } from '../../components/ui/avatar';
import { Card } from '../../components/ui/card';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '../../components/ui/carousel';
import Reveal from '../../components/landing/Reveal';
import HeroScene from '../../components/landing/HeroScene';
import {
  DriverPublishArt,
  EmptyRoutesArt,
  PublishedRoutesArt,
  ScheduleArt,
  SearchRouteArt,
  SeatMapArt,
} from '../../components/landing/illustrations';
import DownloadAppBanner from '../../components/pwa/DownloadAppBanner';
import { todayISODate } from '../../utils/format';

const staticFullRides = [
  {
    from: 'Delhi',
    to: 'Bareilly',
    departure: '06:30',
    capacity: '4/4 seats filled',
    image: '/cabs/maruti-dzire.jpg',
    cabin: 'Sedan',
  },
  {
    from: 'Gurugram',
    to: 'Haldwani',
    departure: '07:15',
    capacity: '6/6 seats filled',
    image: '/cabs/maruti-ertiga.jpg',
    cabin: 'SUV',
  },
  {
    from: 'Noida',
    to: 'Moradabad',
    departure: '08:00',
    capacity: '4/4 seats filled',
    image: '/cabs/hyundai-aura.jpg',
    cabin: 'Sedan',
  },
  {
    from: 'Delhi',
    to: 'Rampur',
    departure: '09:00',
    capacity: '4/4 seats filled',
    image: '/cabs/honda-amaze.jpg',
    cabin: 'Sedan',
  },
  {
    from: 'Noida',
    to: 'Haldwani',
    departure: '10:30',
    capacity: '6/6 seats filled',
    image: '/cabs/kia-carens.jpg',
    cabin: 'SUV',
  },
  {
    from: 'Gurugram',
    to: 'Bareilly',
    departure: '14:00',
    capacity: '4/4 seats filled',
    image: '/cabs/hyundai-verna.jpg',
    cabin: 'Sedan',
  },
];

const testimonials = [
  {
    name: 'Priya Sharma',
    role: 'Passenger',
    city: 'Delhi → Bareilly',
    quote:
      'I booked two seats the night before. The departure was clear, the seats I picked stayed mine, and the ride felt planned — not like waiting for a taxi.',
    image:
      'https://images.unsplash.com/photo-1594744803329-e58b31de8bf5?auto=format&fit=crop&w=240&h=240&q=80',
    initials: 'PS',
  },
  {
    name: 'Rajesh Kumar',
    role: 'Car owner',
    city: 'Gurugram → Haldwani',
    quote:
      'I was driving that route anyway. Publishing seats took a few minutes, and passengers booked the open ones before I left.',
    image:
      'https://images.unsplash.com/photo-1615109390623-222f6f6577f4?auto=format&fit=crop&w=240&h=240&q=80',
    initials: 'RK',
  },
  {
    name: 'Ananya Patel',
    role: 'Passenger',
    city: 'Noida → Moradabad',
    quote:
      'Seeing which seats were already taken helped a lot. I chose mine, paid the driver by UPI, and got confirmation after he approved the proof.',
    image:
      'https://images.unsplash.com/photo-1619895862022-09114b46f5c3?auto=format&fit=crop&w=240&h=240&q=80',
    initials: 'AP',
  },
  {
    name: 'Vikram Singh',
    role: 'Car owner',
    city: 'Delhi → Rampur',
    quote:
      'Setting my own seat price and cabin details felt fair. Passengers know the schedule up front — fewer last-minute calls.',
    image:
      'https://images.unsplash.com/photo-1566492031773-4f4e44671857?auto=format&fit=crop&w=240&h=240&q=80',
    initials: 'VS',
  },
  {
    name: 'Meera Iyer',
    role: 'Passenger',
    city: 'Noida → Haldwani',
    quote:
      'The seat map made it simple. I travelled with my sister, paid on UPI, and the driver confirmed before we left.',
    image:
      'https://images.unsplash.com/photo-1607746882042-944635dfe10e?auto=format&fit=crop&w=240&h=240&q=80',
    initials: 'MI',
  },
  {
    name: 'Arjun Malhotra',
    role: 'Car owner',
    city: 'Gurugram → Bareilly',
    quote:
      'I publish one morning ride a week. Open seats fill early, and I keep the cabin details updated for passengers.',
    image:
      'https://images.unsplash.com/photo-1582750433449-648ed127bb54?auto=format&fit=crop&w=240&h=240&q=80',
    initials: 'AM',
  },
];

const steps = [
  {
    title: 'Search your route',
    body: 'Choose the cities, the date, and how many seats you need.',
    Art: SearchRouteArt,
  },
  {
    title: 'Compare scheduled rides',
    body: 'Look at the published departure, the seat price, and which seats are still open.',
    Art: ScheduleArt,
  },
  {
    title: 'Book the seats',
    body: 'Pick a pickup and a drop, then hold the seats that are actually available.',
    Art: SeatMapArt,
  },
];

const differences = [
  {
    title: 'Scheduled departures',
    body: 'You choose a published departure time, not an on-demand pickup.',
    icon: Clock3,
  },
  {
    title: 'Transparent seat availability',
    body: 'Open seats stay selectable. Booked seats stay blocked.',
    icon: Armchair,
  },
  {
    title: 'Independent driver-published rides',
    body: 'Drivers publish and manage their own journeys and seat prices.',
    icon: CarFront,
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
    <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white">
      {faqs.map((item, index) => {
        const expanded = open === index;
        const panelId = `faq-panel-${index}`;
        return (
          <div key={item.q}>
            <button
              type="button"
              className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-ink transition hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-dark focus-visible:ring-inset"
              aria-expanded={expanded}
              aria-controls={panelId}
              onClick={() => setOpen(expanded ? -1 : index)}
            >
              <span className="font-display text-base font-semibold sm:text-lg">{item.q}</span>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-line bg-surface text-ink">
                {expanded ? (
                  <Minus className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Plus className="h-4 w-4" aria-hidden="true" />
                )}
              </span>
            </button>
            <div
              id={panelId}
              role="region"
              hidden={!expanded}
              className="px-5 pb-5"
            >
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
  const scheduleAutoplay = useRef(
    Autoplay({ delay: 3800, stopOnInteraction: true, stopOnMouseEnter: true })
  );
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
    <div className="rx-landing overflow-x-clip">
      <section className="relative border-b border-line bg-white">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-44 bg-[radial-gradient(ellipse_at_top,_rgba(255,212,59,0.24),_transparent_62%)]" aria-hidden="true" />
        <div className="relative mx-auto max-w-6xl px-4 pt-10 pb-12 md:pt-14 md:pb-16">
          <div className="grid items-center gap-8 md:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] md:gap-10 lg:gap-12">
            <div className="min-w-0">
              <p className="rx-hero-in inline-flex items-center gap-2.5 rounded-full border-2 border-ink/35 bg-white px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-ink shadow-[0_1px_0_rgba(23,23,23,0.06),0_10px_24px_rgba(23,23,23,0.08)] ring-1 ring-emerald-500/25">
                <span className="rx-live-dot" aria-hidden="true" />
                <span className="text-emerald-700">Live</span>
                <span className="h-3 w-px bg-ink/20" aria-hidden="true" />
                <span>Scheduled intercity shared rides</span>
              </p>
              <h1 className="rx-hero-in rx-hero-in-2 mt-4 font-display text-3xl font-semibold leading-[1.08] tracking-[-0.03em] text-ink text-balance sm:text-4xl lg:text-[2.65rem]">
                Your next city is{' '}
                <span className="font-script text-[1.12em] font-normal text-brand-ink italic">
                  closer than you think
                </span>
                .
              </h1>
              <p className="rx-hero-in rx-hero-in-3 mt-4 max-w-[42ch] text-base leading-relaxed text-slate">
                Find a published ride between cities, choose the seats you need, and travel on a schedule you can plan around.
              </p>
              <div className="rx-hero-in rx-hero-in-4 mt-6 flex flex-wrap items-center gap-3">
                <a href="#search-rides">
                  <Button size="lg">
                    <Search className="h-4 w-4" aria-hidden="true" />
                    Find Ride
                  </Button>
                </a>
                <a
                  href="#how-it-works"
                  className="inline-flex items-center gap-1 text-sm font-semibold text-ink underline-offset-4 hover:underline"
                >
                  How it works <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </a>
              </div>
              <p className="rx-hero-in rx-hero-in-5 mt-3 font-script text-xl text-brand-ink">
                Shehar Se Shehar, Saath Safar.
              </p>
            </div>
            <div className="rx-hero-in rx-hero-in-3 min-w-0 md:max-w-none">
              <HeroScene />
            </div>
          </div>

          <div id="search-rides" className="rx-hero-in rx-hero-in-4 scroll-mt-24 relative mt-8 md:mt-10">
            <RideSearchForm hero submitLabel="Find Ride" />
          </div>
        </div>
      </section>

      <section id="how-it-works" className="scroll-mt-20 bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-14 md:py-20">
          <Reveal>
            <h2 className="font-display text-2xl font-semibold text-ink md:text-3xl">How it works</h2>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate">
              Three steps from searching a route to holding the seats that are actually open.
            </p>
          </Reveal>
          <ol className="mt-8 grid gap-5 md:grid-cols-3">
            {steps.map((step, index) => (
              <Reveal key={step.title} as="li" delay={index * 90} className="list-none">
                <article className="flex h-full flex-col overflow-hidden rounded-[1.35rem] border border-line bg-white shadow-[var(--shadow-soft)]">
                  <div className="p-4 pb-0">
                    <step.Art />
                  </div>
                  <div className="flex flex-1 flex-col p-5 pt-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-ink">0{index + 1}</p>
                    <h3 className="mt-2 font-display text-lg font-semibold text-ink">{step.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate">{step.body}</p>
                  </div>
                </article>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      <section className="border-y border-line bg-white">
        <div className="mx-auto max-w-6xl px-4 py-14 md:py-20">
          <div className="grid items-end gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:gap-12">
            <Reveal>
              <div className="inline-flex items-center gap-2 rounded-full border-2 border-emerald-500/30 bg-emerald-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-emerald-800">
                <span className="rx-live-dot" aria-hidden="true" />
                Live on the schedule
              </div>
              <h2 className="mt-3 font-display text-2xl font-semibold text-ink md:text-3xl">Published routes</h2>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate">
                These are routes with a ride on the schedule. A search opens that pair for today.
              </p>
            </Reveal>
            <Reveal delay={100} className="hidden max-w-xs justify-self-end lg:block">
              <PublishedRoutesArt />
            </Reveal>
          </div>

          {catalogQuery.isLoading ? <p className="mt-8 text-sm text-slate">Loading routes…</p> : null}
          {catalogQuery.isError ? (
            <p className="mt-8 text-sm text-danger" role="alert">
              Routes could not be loaded. You can still search from the form above.
            </p>
          ) : null}

          {!catalogQuery.isLoading && !catalogQuery.isError && !routes.length ? (
            <Reveal className="mt-8 flex flex-col items-center rounded-[1.5rem] border-2 border-dashed border-ink/15 bg-surface px-6 py-10 text-center">
              <EmptyRoutesArt className="max-w-sm" />
              <p className="mt-4 max-w-md text-sm text-slate">
                No published routes right now. Use the search above — cities still come from RaahiX locations.
              </p>
            </Reveal>
          ) : null}

          {!catalogQuery.isLoading && !catalogQuery.isError && routes.length ? (
            <ul className="mt-8 grid gap-3 sm:grid-cols-2">
              {routes.map((route, index) => (
                <Reveal key={`${route.from}-${route.to}`} as="li" delay={index * 60} className="list-none">
                  <button
                    type="button"
                    onClick={() => openRoute(route.from, route.to)}
                    className="rx-route-card group flex w-full items-center gap-4 rounded-2xl border-2 border-ink/15 bg-surface p-3.5 text-left shadow-[0_1px_0_rgba(23,23,23,0.03)] transition hover:-translate-y-0.5 hover:border-brand hover:bg-white hover:shadow-[var(--shadow-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-dark"
                  >
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand text-ink">
                      <MapPinned className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-x-2 gap-y-1 font-semibold text-ink">
                        <span>{route.from}</span>
                        <ArrowRight className="rx-route-arrow h-4 w-4 text-brand-ink" aria-hidden="true" />
                        <span>{route.to}</span>
                      </span>
                      <span className="mt-1 flex items-center gap-1.5 text-xs text-slate">
                        <CarFront className="h-3.5 w-3.5 text-brand-ink" aria-hidden="true" />
                        {route.rides} ride{route.rides === 1 ? '' : 's'} today
                      </span>
                    </span>
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-line bg-white px-2.5 py-1.5 text-xs font-semibold text-ink transition group-hover:border-brand group-hover:bg-brand-soft">
                      <Search className="h-3.5 w-3.5" aria-hidden="true" />
                      Search
                    </span>
                  </button>
                </Reveal>
              ))}
            </ul>
          ) : null}

          <Reveal className="mt-10">
            <Carousel
              opts={{ align: 'start', loop: true }}
              plugins={[scheduleAutoplay.current]}
              className="w-full"
            >
              <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-brand-ink">
                    <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
                    Today on the schedule
                  </p>
                  <p className="mt-1 text-sm text-slate">
                    Recent full rides — open the same city pair for today.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <CarouselPrevious className="static top-auto left-auto translate-x-0 translate-y-0" />
                  <CarouselNext className="static top-auto right-auto translate-x-0 translate-y-0" />
                </div>
              </div>
              <CarouselContent className="-ml-4">
                {staticFullRides.map((ride) => (
                  <CarouselItem
                    key={`${ride.from}-${ride.to}-${ride.departure}`}
                    className="basis-[85%] pl-4 sm:basis-1/2 lg:basis-1/3"
                  >
                    <Card className="h-full overflow-hidden border-ink/15 bg-surface p-0 shadow-none transition hover:border-brand hover:bg-white hover:shadow-[var(--shadow-soft)]">
                      <button
                        type="button"
                        onClick={() => openRoute(ride.from, ride.to)}
                        className="rx-route-card group flex h-full w-full cursor-pointer flex-col text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-dark focus-visible:ring-inset"
                      >
                        <span className="relative block aspect-[16/10] overflow-hidden bg-mist">
                          <img
                            src={ride.image}
                            alt=""
                            width={640}
                            height={400}
                            loading="lazy"
                            decoding="async"
                            className="rx-route-media h-full w-full object-cover"
                          />
                          <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full border border-white/40 bg-ink/80 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white backdrop-blur-sm">
                            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" aria-hidden="true" />
                            Full
                          </span>
                          <span className="absolute bottom-3 right-3 rounded-full bg-brand px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-ink">
                            {ride.cabin}
                          </span>
                        </span>
                        <span className="flex flex-1 flex-col p-4">
                          <span className="flex items-center gap-2 font-semibold text-ink">
                            <span>{ride.from}</span>
                            <ArrowRight className="rx-route-arrow h-4 w-4 shrink-0 text-brand-ink" aria-hidden="true" />
                            <span>{ride.to}</span>
                          </span>
                          <span className="mt-3 flex flex-wrap gap-x-3 gap-y-1.5 text-sm text-slate">
                            <span className="inline-flex items-center gap-1.5">
                              <Clock3 className="h-3.5 w-3.5 text-brand-ink" aria-hidden="true" />
                              {ride.departure}
                            </span>
                            <span className="inline-flex items-center gap-1.5">
                              <Users className="h-3.5 w-3.5 text-brand-ink" aria-hidden="true" />
                              {ride.capacity}
                            </span>
                          </span>
                          <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-ink">
                            Search this route
                            <ArrowRight className="rx-route-arrow h-4 w-4 text-brand-ink" aria-hidden="true" />
                          </span>
                        </span>
                      </button>
                    </Card>
                  </CarouselItem>
                ))}
              </CarouselContent>
            </Carousel>
          </Reveal>
        </div>
      </section>

      <section className="bg-surface">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 md:grid-cols-2 md:py-20">
          <Reveal>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-ink">Not an instant taxi</p>
            <h2 className="mt-3 font-display text-2xl font-semibold text-ink md:text-3xl">
              Why this is different from a taxi
            </h2>
            <p className="mt-4 max-w-[48ch] text-sm leading-relaxed text-slate">
              You book a seat on a ride that already has a departure time. You can compare the options for your route, and you choose from the seats that are still open. Drivers publish and manage their own rides.
            </p>
            <ul className="mt-8 space-y-3">
              {differences.map((item) => (
                <li
                  key={item.title}
                  className="flex gap-3 rounded-2xl border-2 border-ink/10 bg-white p-3.5 transition hover:border-brand/50 hover:shadow-[var(--shadow-soft)]"
                >
                  <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand text-ink">
                    <item.icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="font-semibold text-ink">{item.title}</p>
                    <p className="mt-1 text-sm leading-relaxed text-slate">{item.body}</p>
                  </div>
                </li>
              ))}
            </ul>
          </Reveal>
          <Reveal delay={120} className="min-w-0">
            <figure className="overflow-hidden rounded-[1.75rem] border border-line bg-white shadow-[var(--shadow-soft)]">
              <img
                src="/cabs/hyundai-creta.jpg"
                alt="Passenger car ready for an intercity journey"
                width={1200}
                height={800}
                loading="lazy"
                decoding="async"
                className="aspect-[4/3] w-full object-cover"
              />
              <figcaption className="px-5 py-4 text-sm text-slate">
                A published departure. Real seats. A schedule you can plan around.
              </figcaption>
            </figure>
          </Reveal>
        </div>
      </section>

      <section className="overflow-x-clip border-t border-line bg-[linear-gradient(180deg,#fff_0%,#F5F3EC_48%,#fff_100%)]">
        <div className="mx-auto max-w-6xl px-4 pt-14 md:pt-20">
          <Reveal>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-brand-ink">
                  <span className="rx-live-dot" aria-hidden="true" />
                  Stories from the road
                </p>
                <h2 className="mt-3 font-display text-2xl font-semibold text-ink md:text-3xl">
                  Passengers and car owners
                </h2>
                <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate">
                  Real journeys on a published schedule — from both sides of the seat map.
                </p>
              </div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate">
                Auto scroll · hover to pause
              </p>
            </div>
          </Reveal>
        </div>

        <div className="rx-marquee mt-8 pb-14 md:pb-20" aria-label="Customer and driver testimonials">
          <div className="rx-marquee-track">
            {[...testimonials, ...testimonials].map((item, index) => (
              <article
                key={`${item.name}-${index}`}
                className="rx-testimonial-card rounded-[1.5rem] border-2 border-ink/10 bg-white p-5 shadow-[var(--shadow-soft)]"
              >
                <div className="flex items-start gap-4">
                  <Avatar className="h-16 w-16 border-2 border-brand/50 shadow-sm">
                    <AvatarImage src={item.image} alt={item.name} loading="lazy" decoding="async" />
                    <AvatarFallback>{item.initials}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-ink">{item.name}</p>
                        <p className="mt-0.5 text-[11px] font-bold uppercase tracking-[0.12em] text-brand-ink">
                          {item.role}
                        </p>
                      </div>
                      <Quote className="h-6 w-6 shrink-0 text-brand" aria-hidden="true" />
                    </div>
                    <p className="mt-1 text-xs text-slate">{item.city}</p>
                  </div>
                </div>
                <p className="mt-4 text-sm leading-relaxed text-ink">“{item.quote}”</p>
                <div className="mt-4 flex items-center justify-between border-t border-line pt-3">
                  <span className="inline-flex items-center gap-0.5 text-brand-ink" aria-label="5 out of 5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
                    ))}
                  </span>
                  <span className="rounded-full bg-brand-soft px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-brand-ink">
                    Verified trip
                  </span>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="for-drivers" className="rx-ink-band scroll-mt-20">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 md:grid-cols-[1.1fr_0.9fr] md:py-20">
          <Reveal>
            <h2 className="font-display text-2xl font-semibold text-white md:text-3xl">
              Driving that route anyway?
            </h2>
            <p className="rx-ink-band-muted mt-4 max-w-[46ch] text-sm leading-relaxed">
              Publish the journey, set the seat price, and let passengers book the seats you still have.
            </p>
            <p className="mt-3 font-script text-2xl text-brand">Shehar Se Shehar, Saath Safar.</p>
            <Link to="/register/driver" className="mt-6 inline-block">
              <Button size="lg">Offer a ride</Button>
            </Link>
          </Reveal>
          <Reveal delay={100}>
            <DriverPublishArt />
          </Reveal>
        </div>
      </section>

      <section className="border-t border-line bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-14 md:py-16">
          <Reveal>
            <DownloadAppBanner />
          </Reveal>
        </div>
      </section>

      <section className="border-t border-line bg-white">
        <div className="mx-auto max-w-3xl px-4 py-14 md:py-20">
          <Reveal>
            <h2 className="font-display text-2xl font-semibold text-ink md:text-3xl">Questions</h2>
          </Reveal>
          <Reveal delay={80} className="mt-6">
            <FaqList />
          </Reveal>
          <Reveal delay={120} className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link to="/search">
              <Button className="w-full sm:w-auto">
                <Search className="h-4 w-4" aria-hidden="true" />
                Find Ride
              </Button>
            </Link>
            <a href="#how-it-works">
              <Button variant="outline" className="w-full sm:w-auto">
                How it works
              </Button>
            </a>
          </Reveal>
        </div>
      </section>
    </div>
  );
}

import { motion } from 'framer-motion';
import RideSearchForm from '../../components/rides/RideSearchForm';

export default function HomePage() {
  return (
    <div>
      <section className="relative overflow-hidden border-b border-line">
        <div
          className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_#d7ebe6_0%,_transparent_55%),linear-gradient(160deg,_#f3f0ea_0%,_#e8e2d6_45%,_#d7ebe6_100%)]"
          aria-hidden
        />
        <div
          className="absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage:
              'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%230f6b5c\' fill-opacity=\'0.06\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
          }}
          aria-hidden
        />
        <div className="relative mx-auto max-w-6xl px-4 pb-16 pt-14 md:pb-20 md:pt-20">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="max-w-2xl"
          >
            <p className="font-display text-4xl leading-tight text-brand md:text-5xl lg:text-6xl">
              RouteSeat
            </p>
            <h1 className="mt-3 text-xl font-medium text-ink md:text-2xl">
              Book a seat on scheduled shared cabs — calmly, clearly, on time.
            </h1>
            <p className="mt-3 max-w-xl text-ink-muted">
              Fixed departure times for Delhi NCR, Bareilly, and Uttarakhand corridors. Choose your
              seat, hold it briefly, and pay online.
            </p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.12 }}
            className="mt-8 max-w-4xl"
          >
            <RideSearchForm />
          </motion.div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14">
        <h2 className="font-display text-2xl text-ink">How it works</h2>
        <p className="mt-1 max-w-xl text-sm text-ink-muted">
          One clear path from search to confirmation — no live bidding, no mystery fares.
        </p>
        <ol className="mt-8 grid gap-6 md:grid-cols-3">
          {[
            {
              step: '01',
              title: 'Search a corridor',
              body: 'Pick origin, destination, date, and passengers. See only rides with seats left.',
            },
            {
              step: '02',
              title: 'Hold your seats',
              body: 'Select seats from the live map. A short hold keeps them while you enter details.',
            },
            {
              step: '03',
              title: 'Pay & confirm',
              body: 'Checkout locks the fare from the server. Get booking details and a WhatsApp share.',
            },
          ].map((item) => (
            <li key={item.step} className="border-t border-brand/30 pt-4">
              <p className="text-xs font-semibold tracking-widest text-accent">{item.step}</p>
              <h3 className="mt-2 font-display text-xl text-ink">{item.title}</h3>
              <p className="mt-2 text-sm text-ink-muted">{item.body}</p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

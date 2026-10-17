import {
  Bus,
  CalendarDays,
  CreditCard,
  LayoutDashboard,
  Route,
} from 'lucide-react';
import DashboardShell from './DashboardShell';

const tabs = [
  { to: '/app', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/app/rides', label: 'Rides', icon: Bus },
  { to: '/app/trips', label: 'Trips', icon: CalendarDays },
  { to: '/app/vehicle-route', label: 'Vehicle & Route', icon: Route },
  { to: '/app/payments', label: 'Payments', icon: CreditCard },
];

export default function PassengerLayout() {
  return (
    <DashboardShell
      homeTo="/app"
      profileTo="/app/profile"
      tabs={tabs}
      ariaLabel="Passenger dashboard"
    />
  );
}

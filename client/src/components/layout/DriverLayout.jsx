import { Link } from 'react-router-dom';
import {
  CreditCard,
  LayoutDashboard,
  Bus,
  UserRound,
  Users,
} from 'lucide-react';
import Alert from '../ui/Alert';
import DashboardShell from './DashboardShell';
import { useAuth } from '../../context/AuthContext';

const tabs = [
  { to: '/driver', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/driver/rides', label: 'My Rides', icon: Bus },
  { to: '/driver/passengers', label: 'Passengers', icon: Users },
  { to: '/driver/payments', label: 'Payments', icon: CreditCard },
  { to: '/driver/profile', label: 'Profile', icon: UserRound },
];

export default function DriverLayout() {
  const { user } = useAuth();
  const profile = user?.driverProfile;
  const needsProfile = profile && !profile.canPostRides;

  return (
    <DashboardShell
      homeTo="/driver"
      profileTo="/driver/profile"
      tabs={tabs}
      ariaLabel="Driver dashboard"
      banner={
        needsProfile ? (
          <Alert tone="warning" className="mb-4">
            Complete your profile before posting rides.{' '}
            <Link
              to="/driver/profile?complete=1"
              className="font-semibold underline-offset-2 hover:underline"
            >
              Open profile
            </Link>
            {!profile.profileComplete
              ? ' Add licence, UPI, and a vehicle.'
              : ' Waiting for admin verification.'}
          </Alert>
        ) : null
      }
    />
  );
}

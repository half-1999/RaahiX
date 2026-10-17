import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AtSign, CarFront, LockKeyhole, LogIn, UserRound } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getErrorMessage } from '../../services/api';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Alert from '../../components/ui/Alert';
import AuthShell from '../../components/auth/AuthShell';
import { LoginWelcomeArt } from '../../components/landing/illustrations';

const demos = [
  {
    label: 'Passenger',
    icon: UserRound,
    email: 'priya.customer@localcab.dev',
    password: 'Customer@12345',
  },
  {
    label: 'Car owner',
    icon: CarFront,
    email: 'raj.driver@localcab.dev',
    password: 'Driver@12345',
  },
];

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const onChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const fillDemo = (demo) => {
    setForm({ email: demo.email, password: demo.password });
    setError('');
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const user = await login(form);
      const from = location.state?.from;
      if (from) {
        navigate(from, { replace: true, state: { selectedSeats: location.state?.selectedSeats } });
        return;
      }
      if (user.role === 'ADMIN') navigate('/admin', { replace: true });
      else if (user.role === 'DRIVER') {
        const incomplete = user.driverProfile && !user.driverProfile.profileComplete;
        navigate(incomplete ? '/driver/profile?complete=1' : '/driver', { replace: true });
      } else navigate('/app', { replace: true });
    } catch (err) {
      setError(getErrorMessage(err, 'Invalid email, username, or password'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Use your email or username to continue."
      illustration={<LoginWelcomeArt />}
      footer={
        <p className="text-center text-sm text-slate">
          New here?{' '}
          <Link to="/register/customer" className="font-semibold text-brand-ink hover:underline">
            Create account
          </Link>
        </p>
      }
    >
      <div className="rounded-2xl border-2 border-ink/10 bg-white p-4 shadow-[var(--shadow-soft)]">
        <form onSubmit={onSubmit} className="space-y-2.5">
          {error ? <Alert tone="error">{error}</Alert> : null}
          <Input
            dense
            label="Email or username"
            type="text"
            name="email"
            autoComplete="username"
            required
            icon={AtSign}
            placeholder="you@email.com or username"
            value={form.email}
            onChange={onChange}
          />
          <Input
            dense
            label="Password"
            type="password"
            name="password"
            autoComplete="current-password"
            required
            icon={LockKeyhole}
            placeholder="Your password"
            value={form.password}
            onChange={onChange}
          />
          <Button type="submit" loading={loading} className="mt-1 w-full">
            <LogIn className="h-4 w-4" aria-hidden="true" />
            Log in
          </Button>
        </form>

        <div className="mt-3 border-t border-line pt-3">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-slate">
            Quick demo
          </p>
          <div className="grid grid-cols-2 gap-2">
            {demos.map((demo) => (
              <button
                key={demo.label}
                type="button"
                onClick={() => fillDemo(demo)}
                className="flex cursor-pointer flex-col items-start gap-0.5 rounded-xl border border-brand/25 bg-brand-soft px-3 py-2 text-left transition hover:border-brand hover:bg-brand/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-dark"
              >
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink">
                  <demo.icon className="h-3.5 w-3.5 text-brand-ink" aria-hidden="true" />
                  {demo.label}
                </span>
                <span className="truncate text-[11px] text-slate">{demo.email}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </AuthShell>
  );
}

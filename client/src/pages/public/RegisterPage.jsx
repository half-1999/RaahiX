import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { CarFront, LockKeyhole, Mail, Phone, UserPlus, UserRound } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getErrorMessage } from '../../services/api';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Alert from '../../components/ui/Alert';
import { cn } from '../../utils/cn';
import AuthShell from '../../components/auth/AuthShell';
import { SignupWelcomeArt } from '../../components/landing/illustrations';

const emptyForm = {
  name: '',
  email: '',
  phone: '',
  password: '',
};

function accountErrors(fields) {
  const errors = {};
  if (!/^[A-Za-z][A-Za-z .'-]{1,80}$/.test(fields.name.trim())) {
    errors.name = 'Enter a real name, at least 2 letters';
  }
  if (!/^[6-9]\d{9}$/.test(fields.phone.trim())) {
    errors.phone = 'Enter a 10-digit mobile number';
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email.trim())) {
    errors.email = 'Enter a valid email';
  }
  if (!/^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(fields.password)) {
    errors.password = 'Min 8 chars with a letter and number';
  }
  return errors;
}

export default function RegisterPage() {
  const { role: roleParam } = useParams();
  const { register, registerDriver } = useAuth();
  const navigate = useNavigate();
  const [role, setRole] = useState(roleParam === 'driver' ? 'driver' : 'customer');
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setRole(roleParam === 'driver' ? 'driver' : 'customer');
  }, [roleParam]);

  const setField = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const switchRole = (next) => {
    setRole(next);
    setError('');
    setFieldErrors({});
    navigate(next === 'driver' ? '/register/driver' : '/register/customer', { replace: true });
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const errors = accountErrors(form);
    setFieldErrors(errors);
    if (Object.keys(errors).length) return;

    setLoading(true);
    setError('');
    const payload = {
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      password: form.password,
    };

    try {
      if (role === 'driver') {
        await registerDriver(payload);
        navigate('/driver/profile?complete=1', { replace: true });
      } else {
        await register(payload);
        navigate('/app', { replace: true });
      }
    } catch (err) {
      setError(
        getErrorMessage(
          err,
          role === 'driver' ? 'Could not create car owner account' : 'Could not create passenger account'
        )
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Create account"
      subtitle="Same form for both roles. Username is generated for you."
      darkPanel
      illustration={<SignupWelcomeArt />}
      footer={
        <p className="text-center text-sm text-slate">
          Already registered?{' '}
          <Link to="/login" className="font-semibold text-brand-ink hover:underline">
            Log in
          </Link>
        </p>
      }
    >
      <div className="rounded-2xl border-2 border-ink/10 bg-white p-4 shadow-[var(--shadow-soft)]">
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-mist p-1">
          <button
            type="button"
            onClick={() => switchRole('customer')}
            className={cn(
              'inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-sm font-semibold transition',
              role === 'customer' ? 'bg-brand text-ink shadow-sm' : 'text-slate hover:text-ink'
            )}
          >
            <UserRound className="h-4 w-4" aria-hidden="true" />
            Passenger
          </button>
          <button
            type="button"
            onClick={() => switchRole('driver')}
            className={cn(
              'inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-sm font-semibold transition',
              role === 'driver' ? 'bg-brand text-ink shadow-sm' : 'text-slate hover:text-ink'
            )}
          >
            <CarFront className="h-4 w-4" aria-hidden="true" />
            Car owner
          </button>
        </div>

        {role === 'driver' ? (
          <p className="mt-2 text-[11px] leading-snug text-slate">
            After signup, finish licence, UPI, and vehicle on your profile before posting rides.
          </p>
        ) : null}

        <form onSubmit={onSubmit} className="mt-3 space-y-2.5">
          {error ? <Alert tone="error">{error}</Alert> : null}

          <Input
            dense
            label="Full name"
            name="name"
            required
            icon={UserRound}
            placeholder="Your full name"
            value={form.name}
            error={fieldErrors.name}
            onChange={setField}
          />

          <div className="grid grid-cols-2 gap-2.5">
            <Input
              dense
              label="Phone"
              name="phone"
              required
              inputMode="numeric"
              icon={Phone}
              placeholder="10-digit"
              value={form.phone}
              error={fieldErrors.phone}
              onChange={setField}
            />
            <Input
              dense
              label="Email"
              type="email"
              name="email"
              required
              icon={Mail}
              placeholder="you@email.com"
              value={form.email}
              error={fieldErrors.email}
              onChange={setField}
            />
          </div>

          <Input
            dense
            label="Password"
            type="password"
            name="password"
            required
            icon={LockKeyhole}
            placeholder="8+ chars, letter + number"
            value={form.password}
            error={fieldErrors.password}
            onChange={setField}
          />

          <Button type="submit" loading={loading} className="mt-1 w-full">
            <UserPlus className="h-4 w-4" aria-hidden="true" />
            {role === 'driver' ? 'Sign up as car owner' : 'Sign up as passenger'}
          </Button>
        </form>
      </div>
    </AuthShell>
  );
}

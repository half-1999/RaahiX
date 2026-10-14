import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getErrorMessage } from '../../services/api';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Alert from '../../components/ui/Alert';
import Logo from '../../components/brand/Logo';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const onChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

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
      else if (user.role === 'DRIVER') navigate('/driver', { replace: true });
      else navigate('/search', { replace: true });
    } catch (err) {
      setError(getErrorMessage(err, 'Invalid email or password'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-10">
      <h1>
        <Logo size="lg" />
      </h1>
      <p className="mt-1 text-sm text-slate">Shehar Se Shehar, Saath Safar. Log in to book a seat or run your rides.</p>
      <div className="mt-4 rounded-xl border border-line bg-white p-3 text-xs text-black">
        <p className="font-semibold">Demo accounts</p>
        <ul className="mt-1 space-y-1 text-slate">
          <li>
            Passenger: <span className="font-medium text-black">priya.customer@localcab.dev</span> /{' '}
            Customer@12345
          </li>
          <li>
            Driver: <span className="font-medium text-black">raj.driver@localcab.dev</span> / Driver@12345
          </li>
          {/* <li>
            Admin: <span className="font-medium text-black">admin@localcab.dev</span> / Admin@12345
          </li> */}
        </ul>
      </div>
      <form
        onSubmit={onSubmit}
        className="mt-6 space-y-4 rounded-2xl border border-line bg-white p-5 shadow-[var(--shadow-soft)]"
      >
        {error ? <Alert tone="error">{error}</Alert> : null}
        <Input
          label="Email"
          type="email"
          name="email"
          autoComplete="email"
          required
          value={form.email}
          onChange={onChange}
        />
        <Input
          label="Password"
          type="password"
          name="password"
          autoComplete="current-password"
          required
          value={form.password}
          onChange={onChange}
        />
        <Button type="submit" loading={loading} className="w-full">
          Log in
        </Button>
      </form>
      <p className="mt-4 text-center text-sm text-slate">
        New here?{' '}
        <Link to="/register/customer" className="font-semibold text-brand-dark">
          Passenger signup
        </Link>
        {' · '}
        <Link to="/register/driver" className="font-semibold text-brand-dark">
          Driver signup
        </Link>
      </p>
    </div>
  );
}

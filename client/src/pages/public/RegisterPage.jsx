import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getErrorMessage } from '../../services/api';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Alert from '../../components/ui/Alert';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const onChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await register(form);
      navigate('/', { replace: true });
    } catch (err) {
      setError(getErrorMessage(err, 'Could not create account'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-10">
      <h1 className="font-display text-3xl text-ink">Create account</h1>
      <p className="mt-1 text-sm text-ink-muted">Book seats on scheduled shared cabs.</p>
      <form onSubmit={onSubmit} className="mt-6 space-y-4 rounded-2xl border border-line bg-white p-5">
        {error ? <Alert tone="error">{error}</Alert> : null}
        <Input label="Full name" name="name" required value={form.name} onChange={onChange} />
        <Input
          label="Email"
          type="email"
          name="email"
          required
          value={form.email}
          onChange={onChange}
        />
        <Input label="Phone" name="phone" required value={form.phone} onChange={onChange} />
        <Input
          label="Password"
          type="password"
          name="password"
          minLength={8}
          required
          hint="At least 8 characters"
          value={form.password}
          onChange={onChange}
        />
        <Button type="submit" loading={loading} className="w-full">
          Register
        </Button>
      </form>
      <p className="mt-4 text-center text-sm text-ink-muted">
        Already registered?{' '}
        <Link to="/login" className="font-medium text-brand">
          Log in
        </Link>
      </p>
    </div>
  );
}

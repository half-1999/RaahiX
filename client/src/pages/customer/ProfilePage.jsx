import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getErrorMessage } from '../../services/api';
import PageHeader from '../../components/common/PageHeader';
import Alert from '../../components/ui/Alert';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';

export default function ProfilePage() {
  const { user, logout, updateProfile } = useAuth();
  const [form, setForm] = useState({
    name: '',
    phone: '',
    payoutUpi: '',
    age: '',
    currentPassword: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setForm((f) => ({
      ...f,
      name: user?.name || '',
      phone: user?.phone || '',
      payoutUpi: user?.payoutUpi || '',
      age: user?.age ? String(user.age) : '',
    }));
  }, [user]);

  const onChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const onSave = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (form.password && form.password !== form.confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    const payload = {};
    if (form.name.trim() && form.name.trim() !== user?.name) payload.name = form.name.trim();
    if (form.phone.trim() && form.phone.trim() !== user?.phone) payload.phone = form.phone.trim();
    if ((form.payoutUpi || '') !== (user?.payoutUpi || '')) payload.payoutUpi = form.payoutUpi.trim();
    const nextAge = Number(form.age);
    if (form.age && (!Number.isInteger(nextAge) || nextAge < 1 || nextAge > 120)) {
      setError('Age must be a whole number from 1 to 120');
      return;
    }
    if (form.age && nextAge !== user?.age) payload.age = nextAge;
    if (form.password) {
      payload.password = form.password;
      payload.currentPassword = form.currentPassword;
    }

    if (!Object.keys(payload).length) {
      setError('No changes to save');
      return;
    }

    setLoading(true);
    try {
      await updateProfile(payload);
      setSuccess('Profile updated');
      setForm((f) => ({
        ...f,
        currentPassword: '',
        password: '',
        confirmPassword: '',
      }));
    } catch (err) {
      setError(getErrorMessage(err, 'Could not update profile'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <PageHeader title="Profile" subtitle="Your RaahiX account and refund UPI" />

      <form onSubmit={onSave} className="rounded-xl border border-line bg-white p-5">
        {error ? <Alert tone="error" className="mb-4">{error}</Alert> : null}
        {success ? <Alert tone="success" className="mb-4">{success}</Alert> : null}

        <div className="mb-4 flex flex-wrap gap-2">
          <Badge tone="brand">{user?.role}</Badge>
          <Badge tone={user?.status === 'ACTIVE' ? 'success' : 'warning'}>
            {user?.status || '—'}
          </Badge>
        </div>

        <div className="space-y-4">
          <Input label="Full name" name="name" required value={form.name} onChange={onChange} />
          <Input label="Age" name="age" type="number" min={1} max={120} value={form.age} onChange={onChange} hint="Used on your ticket when you book a seat" />
          <Input label="Refund UPI ID" name="payoutUpi" value={form.payoutUpi} onChange={onChange} hint="Used only if a driver owes you a refund" />
          <Input label="Email" value={user?.email || ''} disabled hint="Email cannot be changed" />
          <Input label="Phone" name="phone" required value={form.phone} onChange={onChange} />

          <div className="border-t border-line pt-4">
            <p className="mb-3 text-sm font-semibold text-navy">Change password</p>
            <div className="space-y-4">
              <Input
                label="Current password"
                type="password"
                name="currentPassword"
                value={form.currentPassword}
                onChange={onChange}
                autoComplete="current-password"
              />
              <Input
                label="New password"
                type="password"
                name="password"
                minLength={8}
                value={form.password}
                onChange={onChange}
                hint="Leave blank to keep current password"
                autoComplete="new-password"
              />
              <Input
                label="Confirm new password"
                type="password"
                name="confirmPassword"
                minLength={8}
                value={form.confirmPassword}
                onChange={onChange}
                autoComplete="new-password"
              />
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Button type="submit" loading={loading}>
            Save changes
          </Button>
          <Button type="button" variant="outline" onClick={() => logout()}>
            Log out
          </Button>
        </div>
      </form>
    </div>
  );
}

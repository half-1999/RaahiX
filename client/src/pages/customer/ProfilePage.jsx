import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AtSign, CarFront, CheckCircle2, CircleAlert, IdCard } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getErrorMessage } from '../../services/api';
import PageHeader from '../../components/common/PageHeader';
import Alert from '../../components/ui/Alert';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import { Card, CardContent } from '../../components/ui/card';

const genderOptions = [
  { value: 'MALE', label: 'Male' },
  { value: 'FEMALE', label: 'Female' },
  { value: 'OTHER', label: 'Other' },
  { value: 'PREFER_NOT', label: 'Prefer not to say' },
];

export default function ProfilePage() {
  const { user, logout, updateProfile } = useAuth();
  const [searchParams] = useSearchParams();
  const showCompleteHint = searchParams.get('complete') === '1';
  const isDriver = user?.role === 'DRIVER';
  const driverProfile = user?.driverProfile;

  const [form, setForm] = useState({
    name: '',
    phone: '',
    payoutUpi: '',
    age: '',
    gender: '',
    city: '',
    state: '',
    address: '',
    bio: '',
    dateOfBirth: '',
    licenseNumber: '',
    upiId: '',
    paymentInstructions: '',
    currentPassword: '',
    password: '',
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
      gender: user?.gender || '',
      city: user?.city || '',
      state: user?.state || '',
      address: user?.address || '',
      bio: user?.bio || '',
      dateOfBirth: user?.dateOfBirth || '',
      licenseNumber: driverProfile?.licenseNumber || '',
      upiId: driverProfile?.upiId || '',
      paymentInstructions: driverProfile?.paymentInstructions || '',
    }));
  }, [user, driverProfile]);

  const missingLabels = useMemo(() => {
    const map = {
      license: 'Driving licence',
      upi: 'UPI for passenger payments',
      vehicle: 'At least one active vehicle',
      verification: 'Admin verification',
    };
    return (driverProfile?.missing || []).map((key) => map[key] || key);
  }, [driverProfile]);

  const onChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const onSave = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const payload = {};
    if (form.name.trim() && form.name.trim() !== user?.name) payload.name = form.name.trim();
    if (form.phone.trim() && form.phone.trim() !== user?.phone) payload.phone = form.phone.trim();
    if ((form.payoutUpi || '') !== (user?.payoutUpi || '')) payload.payoutUpi = form.payoutUpi.trim();
    if ((form.gender || null) !== (user?.gender || null)) payload.gender = form.gender || null;
    if ((form.city || '') !== (user?.city || '')) payload.city = form.city.trim();
    if ((form.state || '') !== (user?.state || '')) payload.state = form.state.trim();
    if ((form.address || '') !== (user?.address || '')) payload.address = form.address.trim();
    if ((form.bio || '') !== (user?.bio || '')) payload.bio = form.bio.trim();
    if ((form.dateOfBirth || null) !== (user?.dateOfBirth || null)) {
      payload.dateOfBirth = form.dateOfBirth || null;
    }

    const nextAge = Number(form.age);
    if (form.age && (!Number.isInteger(nextAge) || nextAge < 1 || nextAge > 120)) {
      setError('Age must be a whole number from 1 to 120');
      return;
    }
    if (form.age && nextAge !== user?.age) payload.age = nextAge;
    if (!form.age && user?.age) payload.age = null;

    if (isDriver) {
      if ((form.licenseNumber || '') !== (driverProfile?.licenseNumber || '')) {
        payload.licenseNumber = form.licenseNumber.trim().toUpperCase();
      }
      if ((form.upiId || '') !== (driverProfile?.upiId || '')) payload.upiId = form.upiId.trim();
      if ((form.paymentInstructions || '') !== (driverProfile?.paymentInstructions || '')) {
        payload.paymentInstructions = form.paymentInstructions.trim();
      }
    }

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
      setForm((f) => ({ ...f, currentPassword: '', password: '' }));
    } catch (err) {
      setError(getErrorMessage(err, 'Could not update profile'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-4xl">
      <PageHeader
        title="Profile"
        subtitle={
          isDriver
            ? 'Complete your account before you can post rides'
            : 'Your RaahiX account details'
        }
      />

      {showCompleteHint && isDriver ? (
        <Alert tone="warning" className="mb-4">
          Finish your car owner profile — licence, UPI, and a vehicle — then wait for verification before posting rides.
        </Alert>
      ) : null}

      {isDriver && driverProfile ? (
        <Card className="mb-4 border-ink/15 bg-surface">
          <CardContent className="space-y-3 p-4 sm:p-5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={driverProfile.profileComplete ? 'success' : 'warning'}>
                {driverProfile.profileComplete ? 'Profile complete' : 'Profile incomplete'}
              </Badge>
              <Badge tone={driverProfile.verificationStatus === 'VERIFIED' ? 'success' : 'warning'}>
                {driverProfile.verificationStatus}
              </Badge>
              <Badge tone={driverProfile.canPostRides ? 'success' : 'neutral'}>
                {driverProfile.canPostRides ? 'Can post rides' : 'Cannot post rides yet'}
              </Badge>
            </div>
            {missingLabels.length ? (
              <ul className="space-y-1.5 text-sm text-slate">
                {missingLabels.map((label) => (
                  <li key={label} className="flex items-center gap-2">
                    <CircleAlert className="h-4 w-4 text-brand-ink" aria-hidden="true" />
                    {label}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="flex items-center gap-2 text-sm text-ink">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden="true" />
                Ready to publish once your routes and schedule are set.
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <Link to="/driver/vehicle-route?section=vehicles">
                <Button type="button" variant="outline" size="sm">
                  <CarFront className="h-4 w-4" aria-hidden="true" />
                  Vehicles
                </Button>
              </Link>
              <Link to="/driver/vehicle-route?section=routes">
                <Button type="button" variant="outline" size="sm">
                  Routes
                </Button>
              </Link>
              <Link to="/driver/payments">
                <Button type="button" variant="outline" size="sm">
                  Payments
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <form onSubmit={onSave} className="rounded-2xl border-2 border-ink/10 bg-white p-5 shadow-[var(--shadow-soft)]">
        {error ? <Alert tone="error" className="mb-4">{error}</Alert> : null}
        {success ? <Alert tone="success" className="mb-4">{success}</Alert> : null}

        <div className="mb-4 flex flex-wrap gap-2">
          <Badge tone="brand">{user?.role}</Badge>
          <Badge tone={user?.status === 'ACTIVE' ? 'success' : 'warning'}>{user?.status || '—'}</Badge>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Username"
            value={user?.username || ''}
            disabled
            icon={AtSign}
            hint="Generated automatically and stored with your account"
            className="sm:col-span-2"
          />
          <Input label="Full name" name="name" required value={form.name} onChange={onChange} className="sm:col-span-2" />
          <Input label="Email" value={user?.email || ''} disabled hint="Email cannot be changed" />
          <Input label="Phone" name="phone" required value={form.phone} onChange={onChange} />
          <Input label="Age" name="age" type="number" min={1} max={120} value={form.age} onChange={onChange} />
          <Select
            label="Gender"
            name="gender"
            value={form.gender}
            onChange={onChange}
            placeholder="Select"
            options={genderOptions}
          />
          <Input label="Date of birth" name="dateOfBirth" type="date" value={form.dateOfBirth} onChange={onChange} />
          <Input label="City" name="city" value={form.city} onChange={onChange} />
          <Input label="State" name="state" value={form.state} onChange={onChange} />
          <Input
            label="Address"
            name="address"
            value={form.address}
            onChange={onChange}
            className="sm:col-span-2"
          />
          <Input
            label="About you"
            name="bio"
            value={form.bio}
            onChange={onChange}
            hint="Optional, up to 300 characters"
            className="sm:col-span-2"
          />
          <Input
            label="Refund UPI ID"
            name="payoutUpi"
            value={form.payoutUpi}
            onChange={onChange}
            hint="Used if a refund is owed to you"
            className="sm:col-span-2"
          />
        </div>

        {isDriver ? (
          <div className="mt-6 border-t border-line pt-5">
            <p className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-ink">
              <IdCard className="h-4 w-4 text-brand-ink" aria-hidden="true" />
              Car owner details
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Driving licence number"
                name="licenseNumber"
                required
                value={form.licenseNumber}
                onChange={onChange}
                className="sm:col-span-2"
              />
              <Input
                label="Passenger payment UPI"
                name="upiId"
                required
                value={form.upiId}
                onChange={onChange}
                hint="Passengers pay this ID for bookings"
                className="sm:col-span-2"
              />
              <Input
                label="Payment instructions"
                name="paymentInstructions"
                value={form.paymentInstructions}
                onChange={onChange}
                className="sm:col-span-2"
              />
            </div>
          </div>
        ) : null}

        <div className="mt-6 border-t border-line pt-5">
          <p className="mb-3 text-sm font-semibold text-ink">Change password</p>
          <div className="grid gap-4 sm:grid-cols-2">
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
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Button type="submit" loading={loading}>
            Save changes
          </Button>
          {isDriver ? (
            <Link to="/driver">
              <Button type="button" variant="outline">
                Driver home
              </Button>
            </Link>
          ) : null}
          <Button type="button" variant="outline" onClick={() => logout()}>
            Log out
          </Button>
        </div>
      </form>
    </div>
  );
}

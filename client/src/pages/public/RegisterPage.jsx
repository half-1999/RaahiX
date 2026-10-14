import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { CarFront, UserRound } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getErrorMessage } from '../../services/api';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Alert from '../../components/ui/Alert';
import Badge from '../../components/ui/Badge';
import { cn } from '../../utils/cn';
import CabDetailsForm from '../../components/vehicles/CabDetailsForm';
import Logo from '../../components/brand/Logo';
import {
  VEHICLE_TYPES,
  capacityForType,
  seatConfigurationForType,
} from '../../utils/vehicleLayouts';

const emptyCustomer = {
  name: '',
  email: '',
  phone: '',
  password: '',
  confirmPassword: '',
};

const emptyDriver = {
  name: '',
  email: '',
  phone: '',
  password: '',
  confirmPassword: '',
  licenseNumber: '',
  registrationNumber: '',
  make: 'Maruti',
  model: 'Dzire',
  vehicleType: VEHICLE_TYPES.FIVE_SEATER,
  features: ['AC', 'Charging'],
  customMake: false,
  customModel: false,
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
    errors.password = 'Use at least 8 characters with a letter and a number';
  }
  if (fields.password !== fields.confirmPassword) {
    errors.confirmPassword = 'Passwords do not match';
  }
  return errors;
}

export default function RegisterPage() {
  const { role: roleParam } = useParams();
  const { register, registerDriver } = useAuth();
  const navigate = useNavigate();
  const initialRole = roleParam === 'driver' ? 'driver' : 'customer';
  const [role, setRole] = useState(initialRole);
  const [customer, setCustomer] = useState(emptyCustomer);
  const [driver, setDriver] = useState(emptyDriver);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const seatConfiguration = useMemo(
    () => seatConfigurationForType(driver.vehicleType),
    [driver.vehicleType]
  );

  const setCustomerField = (e) =>
    setCustomer((f) => ({ ...f, [e.target.name]: e.target.value }));
  const setDriverField = (e) => {
    const { name, value } = e.target;
    setDriver((f) => {
      const next = { ...f, [name]: value };
      if (name === 'vehicleType') {
        if (value === VEHICLE_TYPES.SIX_SEATER) {
          next.make = next.make === 'Maruti' && next.model === 'Dzire' ? 'Maruti' : next.make;
          next.model = next.model === 'Dzire' ? 'Ertiga' : next.model;
        } else if (next.model === 'Ertiga') {
          next.model = 'Dzire';
        }
      }
      return next;
    });
  };

  const switchRole = (next) => {
    setRole(next);
    setError('');
    navigate(next === 'driver' ? '/register/driver' : '/register/customer', { replace: true });
  };

  const onSubmitCustomer = async (e) => {
    e.preventDefault();
    const errors = accountErrors(customer);
    setFieldErrors(errors);
    if (Object.keys(errors).length) return;
    setLoading(true);
    setError('');
    try {
      await register({
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        password: customer.password,
      });
      navigate('/search', { replace: true });
    } catch (err) {
      setError(getErrorMessage(err, 'Could not create passenger account'));
    } finally {
      setLoading(false);
    }
  };

  const onSubmitDriver = async (e) => {
    e.preventDefault();
    const errors = accountErrors(driver);
    if (!/^[A-Za-z0-9-]{5,20}$/.test(driver.licenseNumber.trim())) {
      errors.licenseNumber = 'Enter the licence number';
    }
    if (!/^[A-Z0-9]{6,12}$/.test(driver.registrationNumber.trim().toUpperCase())) {
      errors.registrationNumber = 'Use 6–12 letters or numbers';
    }
    if (!driver.make.trim()) errors.make = 'Choose or enter a company';
    if (!driver.model.trim()) errors.model = 'Choose or enter a model';
    if (!driver.features.length) errors.features = 'Pick at least one feature';
    setFieldErrors(errors);
    if (Object.keys(errors).length) return;
    setLoading(true);
    setError('');
    try {
      await registerDriver({
        name: driver.name,
        email: driver.email,
        phone: driver.phone,
        password: driver.password,
        licenseNumber: driver.licenseNumber,
        vehicle: {
          registrationNumber: driver.registrationNumber,
          make: driver.make,
          model: driver.model,
          vehicleType: driver.vehicleType,
          capacity: capacityForType(driver.vehicleType),
          seatConfiguration,
          features: driver.features,
        },
      });
      navigate('/driver', { replace: true });
    } catch (err) {
      setError(getErrorMessage(err, 'Could not create driver account'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Logo size="lg" />
      <h1 className="mt-4 font-display text-3xl font-bold text-navy">Create your RaahiX account</h1>
      <p className="mt-1 text-sm text-slate">
        Choose passenger or car owner registration. Car owner signup includes full car details.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-2 rounded-2xl border border-line bg-white p-1.5 shadow-[var(--shadow-soft)]">
        <button
          type="button"
          onClick={() => switchRole('customer')}
          className={cn(
            'inline-flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-semibold transition',
            role === 'customer' ? 'bg-brand text-ink shadow-[var(--shadow-lift)]' : 'text-slate hover:bg-mist'
          )}
        >
          <UserRound className="h-4 w-4" />
          Passenger
        </button>
        <button
          type="button"
          onClick={() => switchRole('driver')}
          className={cn(
            'inline-flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-semibold transition',
            role === 'driver' ? 'bg-brand text-ink shadow-[var(--shadow-lift)]' : 'text-slate hover:bg-mist'
          )}
        >
          <CarFront className="h-4 w-4" />
          Car owner
        </button>
      </div>

      {role === 'customer' ? (
        <form
          onSubmit={onSubmitCustomer}
          className="mt-6 space-y-4 rounded-2xl border border-line bg-white p-5 shadow-[var(--shadow-soft)] md:p-6"
        >
          <div>
            <h2 className="font-display text-xl font-bold text-navy">Passenger details</h2>
            <p className="text-sm text-slate">Book seats, manage trips, and pay securely.</p>
          </div>
          {error ? <Alert tone="error">{error}</Alert> : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Full name" name="name" required value={customer.name} error={fieldErrors.name} onChange={setCustomerField} />
            <Input label="Phone" name="phone" required inputMode="numeric" value={customer.phone} error={fieldErrors.phone} onChange={setCustomerField} />
            <Input
              label="Email"
              type="email"
              name="email"
              required
              value={customer.email}
              error={fieldErrors.email}
              onChange={setCustomerField}
              className="sm:col-span-2"
            />
            <Input
              label="Password"
              type="password"
              name="password"
              required
              hint="At least 8 characters, with a letter and a number"
              value={customer.password}
              error={fieldErrors.password}
              onChange={setCustomerField}
            />
            <Input
              label="Confirm password"
              type="password"
              name="confirmPassword"
              required
              value={customer.confirmPassword}
              error={fieldErrors.confirmPassword}
              onChange={setCustomerField}
            />
          </div>
          <Button type="submit" loading={loading} className="w-full sm:w-auto">
            Create passenger account
          </Button>
        </form>
      ) : (
        <form
          onSubmit={onSubmitDriver}
          className="mt-6 space-y-6 rounded-2xl border border-line bg-white p-5 shadow-[var(--shadow-soft)] md:p-6"
        >
          <div>
            <h2 className="font-display text-xl font-bold text-navy">Car owner registration</h2>
            <p className="text-sm text-slate">
              Your profile stays pending verification until an admin reviews license and vehicle docs.
            </p>
          </div>
          {error ? <Alert tone="error">{error}</Alert> : null}

          <section className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-coral">Account</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Full name" name="name" required value={driver.name} error={fieldErrors.name} onChange={setDriverField} />
              <Input label="Phone" name="phone" required value={driver.phone} error={fieldErrors.phone} onChange={setDriverField} />
              <Input
                label="Email"
                type="email"
                name="email"
                required
                value={driver.email}
                error={fieldErrors.email}
                onChange={setDriverField}
                className="sm:col-span-2"
              />
              <Input
                label="Password"
                type="password"
                name="password"
                required
                value={driver.password}
                error={fieldErrors.password}
                onChange={setDriverField}
              />
              <Input
                label="Confirm password"
                type="password"
                name="confirmPassword"
                required
                value={driver.confirmPassword}
                error={fieldErrors.confirmPassword}
                onChange={setDriverField}
              />
              <Input
                label="Driving licence number"
                name="licenseNumber"
                required
                value={driver.licenseNumber}
                error={fieldErrors.licenseNumber}
                onChange={setDriverField}
                className="sm:col-span-2"
              />
            </div>
          </section>

          <section className="space-y-4 border-t border-line pt-5">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-coral">Car details</h3>
            <CabDetailsForm
              value={driver}
              errors={fieldErrors}
              onChange={(next) => setDriver(next)}
            />
            <div className="rounded-xl bg-mist/80 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate">
                Cabin layout · {capacityForType(driver.vehicleType)} passenger seats
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {seatConfiguration.map((s) => (
                  <Badge key={s.seatNumber} tone="brand">
                    {s.seatNumber} · R{s.row}
                  </Badge>
                ))}
              </div>
            </div>
          </section>

          <Button type="submit" loading={loading} className="w-full sm:w-auto">
            Register as a car owner
          </Button>
        </form>
      )}

      <p className="mt-4 text-center text-sm text-slate">
        Already registered?{' '}
        <Link to="/login" className="font-semibold text-brand-dark">
          Log in
        </Link>
      </p>
    </div>
  );
}

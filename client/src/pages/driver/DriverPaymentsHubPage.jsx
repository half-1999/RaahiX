import { useSearchParams } from 'react-router-dom';
import { CreditCard, RotateCcw } from 'lucide-react';
import { SectionSwitcher } from '../../components/layout/DashboardShell';
import DriverPaymentsPage from './DriverPaymentsPage';
import DriverRefundsPage from './DriverRefundsPage';

export default function DriverPaymentsHubPage() {
  const [params, setParams] = useSearchParams();
  const section = params.get('section') === 'refunds' ? 'refunds' : 'payments';

  function changeSection(id) {
    const next = new URLSearchParams(params);
    next.set('section', id);
    setParams(next, { replace: true });
  }

  return (
    <div className="space-y-2">
      <SectionSwitcher
        value={section}
        onChange={changeSection}
        items={[
          { id: 'payments', label: 'Payment History', icon: CreditCard },
          { id: 'refunds', label: 'Refund History', icon: RotateCcw },
        ]}
      />
      {section === 'payments' ? <DriverPaymentsPage /> : <DriverRefundsPage />}
    </div>
  );
}
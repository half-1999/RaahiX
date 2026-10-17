import { useSearchParams } from 'react-router-dom';
import { Car, Route } from 'lucide-react';
import { SectionSwitcher } from '../../components/layout/DashboardShell';
import DriverVehiclesPage from './DriverVehiclesPage';
import DriverRoutesPage from './DriverRoutesPage';

export default function DriverVehicleRoutePage() {
  const [params, setParams] = useSearchParams();
  const section = params.get('section') === 'routes' ? 'routes' : 'vehicles';

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
          { id: 'vehicles', label: 'Vehicles', icon: Car },
          { id: 'routes', label: 'Routes', icon: Route },
        ]}
      />
      {section === 'vehicles' ? <DriverVehiclesPage /> : <DriverRoutesPage />}
    </div>
  );
}

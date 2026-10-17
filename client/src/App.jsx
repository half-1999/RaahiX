import { BrowserRouter, Navigate, Route, Routes, useParams } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './routes/ProtectedRoute';
import RoleRoute from './routes/RoleRoute';
import PublicLayout from './components/layout/PublicLayout';
import DriverLayout from './components/layout/DriverLayout';
import PassengerLayout from './components/layout/PassengerLayout';
import AdminLayout from './components/layout/AdminLayout';
import ErrorBoundary from './components/common/ErrorBoundary';
import ScrollToTop from './components/common/ScrollToTop';
import BrandLoader from './components/brand/BrandLoader';

import HomePage from './pages/public/HomePage';
import SearchPage from './pages/public/SearchPage';
import RideDetailPage from './pages/public/RideDetailPage';
import LoginPage from './pages/public/LoginPage';
import RegisterPage from './pages/public/RegisterPage';

import CheckoutPage from './pages/customer/CheckoutPage';
import BookingSuccessPage from './pages/customer/BookingSuccessPage';
import BookingDetailPage from './pages/customer/BookingDetailPage';
import ProfilePage from './pages/customer/ProfilePage';
import NotificationsPage from './pages/customer/NotificationsPage';
import PassengerOverviewPage from './pages/customer/PassengerOverviewPage';
import PassengerRidesPage from './pages/customer/PassengerRidesPage';
import PassengerTripsPage from './pages/customer/PassengerTripsPage';
import PassengerVehicleRoutePage from './pages/customer/PassengerVehicleRoutePage';
import PassengerPaymentsPage from './pages/customer/PassengerPaymentsPage';

import DriverDashboardPage from './pages/driver/DriverDashboardPage';
import DriverRidesPage from './pages/driver/DriverRidesPage';
import DriverRideDetailPage from './pages/driver/DriverRideDetailPage';
import DriverVehicleRoutePage from './pages/driver/DriverVehicleRoutePage';
import DriverPaymentsHubPage from './pages/driver/DriverPaymentsHubPage';
import DriverPassengersHubPage from './pages/driver/DriverPassengersHubPage';
import DriverPassengersPage from './pages/driver/DriverPassengersPage';

import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import AdminUsersPage from './pages/admin/AdminUsersPage';
import AdminDriversPage from './pages/admin/AdminDriversPage';
import AdminVehiclesPage from './pages/admin/AdminVehiclesPage';
import AdminRoutesPage from './pages/admin/AdminRoutesPage';
import AdminRidesPage from './pages/admin/AdminRidesPage';
import AdminBookingsPage from './pages/admin/AdminBookingsPage';
import AdminPaymentsPage from './pages/admin/AdminPaymentsPage';
import AdminReportsPage from './pages/admin/AdminReportsPage';
import AdminAuditLogsPage from './pages/admin/AdminAuditLogsPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 30_000 },
  },
});

function BootGate({ children }) {
  const { loading } = useAuth();
  if (loading) return <BrandLoader />;
  return children;
}

function RoleHomeRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'ADMIN') return <Navigate to="/admin" replace />;
  if (user.role === 'DRIVER') return <Navigate to="/driver" replace />;
  return <Navigate to="/app" replace />;
}

function ProfileRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'DRIVER') return <Navigate to="/driver/profile" replace />;
  if (user.role === 'ADMIN') return <Navigate to="/admin" replace />;
  return <Navigate to="/app/profile" replace />;
}

function DriverPassengersRedirect() {
  const { rideId } = useParams();
  return <Navigate to={`/driver/rides/${rideId}`} replace />;
}

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <BootGate>
          <BrowserRouter>
            <ScrollToTop />
            <Routes>
              <Route element={<PublicLayout />}>
                <Route index element={<HomePage />} />
                <Route path="search" element={<SearchPage />} />
                <Route path="rides/:rideId" element={<RideDetailPage />} />
                <Route path="login" element={<LoginPage />} />
                <Route path="register" element={<RegisterPage />} />
                <Route path="register/:role" element={<RegisterPage />} />
                <Route
                  path="checkout"
                  element={
                    <ProtectedRoute>
                      <RoleRoute roles={['CUSTOMER']}>
                        <CheckoutPage />
                      </RoleRoute>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="booking-success"
                  element={
                    <ProtectedRoute>
                      <RoleRoute roles={['CUSTOMER']}>
                        <BookingSuccessPage />
                      </RoleRoute>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="booking/:bookingId"
                  element={
                    <ProtectedRoute>
                      <RoleRoute roles={['CUSTOMER', 'ADMIN']}>
                        <BookingDetailPage />
                      </RoleRoute>
                    </ProtectedRoute>
                  }
                />
                <Route path="my-bookings" element={<Navigate to="/app/trips" replace />} />
                <Route path="profile" element={<ProfileRedirect />} />
                <Route
                  path="notifications"
                  element={
                    <ProtectedRoute>
                      <NotificationsPage />
                    </ProtectedRoute>
                  }
                />
                <Route path="home" element={<RoleHomeRedirect />} />
              </Route>

              <Route
                path="app"
                element={
                  <ProtectedRoute>
                    <RoleRoute roles={['CUSTOMER']}>
                      <PassengerLayout />
                    </RoleRoute>
                  </ProtectedRoute>
                }
              >
                <Route index element={<PassengerOverviewPage />} />
                <Route path="rides" element={<PassengerRidesPage />} />
                <Route path="trips" element={<PassengerTripsPage />} />
                <Route path="vehicle-route" element={<PassengerVehicleRoutePage />} />
                <Route path="payments" element={<PassengerPaymentsPage />} />
                <Route path="profile" element={<ProfilePage />} />
              </Route>

              <Route
                path="driver"
                element={
                  <ProtectedRoute>
                    <RoleRoute roles={['DRIVER']}>
                      <DriverLayout />
                    </RoleRoute>
                  </ProtectedRoute>
                }
              >
                <Route index element={<DriverDashboardPage />} />
                <Route path="rides" element={<DriverRidesPage />} />
                <Route path="rides/:rideId" element={<DriverRideDetailPage />} />
                <Route path="rides/:rideId/passengers" element={<DriverPassengersPage />} />
                <Route path="trips" element={<Navigate to="/driver/rides" replace />} />
                <Route path="trips/:rideId" element={<DriverPassengersRedirect />} />
                <Route path="passengers" element={<DriverPassengersHubPage />} />
                <Route path="vehicle-route" element={<DriverVehicleRoutePage />} />
                <Route path="vehicles" element={<Navigate to="/driver/profile?section=vehicles" replace />} />
                <Route path="routes" element={<Navigate to="/driver/profile?section=routes" replace />} />
                <Route path="payments" element={<DriverPaymentsHubPage />} />
                <Route path="refunds" element={<Navigate to="/driver/payments?section=refunds" replace />} />
                <Route path="profile" element={<ProfilePage />} />
              </Route>

              <Route
                path="admin"
                element={
                  <ProtectedRoute>
                    <RoleRoute roles={['ADMIN']}>
                      <AdminLayout />
                    </RoleRoute>
                  </ProtectedRoute>
                }
              >
                <Route index element={<AdminDashboardPage />} />
                <Route path="users" element={<AdminUsersPage />} />
                <Route path="drivers" element={<AdminDriversPage />} />
                <Route path="vehicles" element={<AdminVehiclesPage />} />
                <Route path="routes" element={<AdminRoutesPage />} />
                <Route path="rides" element={<AdminRidesPage />} />
                <Route path="bookings" element={<AdminBookingsPage />} />
                <Route path="payments" element={<AdminPaymentsPage />} />
                <Route path="reports" element={<AdminReportsPage />} />
                <Route path="audit-logs" element={<AdminAuditLogsPage />} />
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
          </BootGate>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

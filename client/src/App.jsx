import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './routes/ProtectedRoute';
import RoleRoute from './routes/RoleRoute';
import PublicLayout from './components/layout/PublicLayout';
import DriverLayout from './components/layout/DriverLayout';
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
import MyBookingsPage from './pages/customer/MyBookingsPage';
import ProfilePage from './pages/customer/ProfilePage';
import NotificationsPage from './pages/customer/NotificationsPage';

import DriverDashboardPage from './pages/driver/DriverDashboardPage';
import DriverRidesPage from './pages/driver/DriverRidesPage';
import DriverRideDetailPage from './pages/driver/DriverRideDetailPage';
import DriverPassengersPage from './pages/driver/DriverPassengersPage';
import DriverVehiclesPage from './pages/driver/DriverVehiclesPage';
import DriverRoutesPage from './pages/driver/DriverRoutesPage';
import DriverPaymentsPage from './pages/driver/DriverPaymentsPage';
import DriverRefundsPage from './pages/driver/DriverRefundsPage';

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
  return <Navigate to="/my-bookings" replace />;
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
                <Route
                  path="my-bookings"
                  element={
                    <ProtectedRoute>
                      <RoleRoute roles={['CUSTOMER']}>
                        <MyBookingsPage />
                      </RoleRoute>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="profile"
                  element={
                    <ProtectedRoute>
                      <ProfilePage />
                    </ProtectedRoute>
                  }
                />
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
                <Route path="vehicles" element={<DriverVehiclesPage />} />
                <Route path="routes" element={<DriverRoutesPage />} />
                <Route path="payments" element={<DriverPaymentsPage />} />
                <Route path="refunds" element={<DriverRefundsPage />} />
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

import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import RoleRoute from './RoleRoute';
import PublicLayout from '../components/layout/PublicLayout';
import DriverLayout from '../components/layout/DriverLayout';
import AdminLayout from '../components/layout/AdminLayout';

import HomePage from '../pages/public/HomePage';
import SearchPage from '../pages/public/SearchPage';
import RideDetailPage from '../pages/public/RideDetailPage';
import LoginPage from '../pages/public/LoginPage';
import RegisterPage from '../pages/public/RegisterPage';

import CheckoutPage from '../pages/customer/CheckoutPage';
import BookingDetailPage from '../pages/customer/BookingDetailPage';
import BookingSuccessPage from '../pages/customer/BookingSuccessPage';
import MyBookingsPage from '../pages/customer/MyBookingsPage';
import ProfilePage from '../pages/customer/ProfilePage';

import DriverDashboardPage from '../pages/driver/DriverDashboardPage';
import DriverRidesPage from '../pages/driver/DriverRidesPage';
import DriverRideDetailPage from '../pages/driver/DriverRideDetailPage';
import DriverPassengersPage from '../pages/driver/DriverPassengersPage';

import AdminDashboardPage from '../pages/admin/AdminDashboardPage';
import AdminUsersPage from '../pages/admin/AdminUsersPage';
import AdminDriversPage from '../pages/admin/AdminDriversPage';
import AdminVehiclesPage from '../pages/admin/AdminVehiclesPage';
import AdminRoutesPage from '../pages/admin/AdminRoutesPage';
import AdminRidesPage from '../pages/admin/AdminRidesPage';
import AdminBookingsPage from '../pages/admin/AdminBookingsPage';
import AdminPaymentsPage from '../pages/admin/AdminPaymentsPage';
import AdminReportsPage from '../pages/admin/AdminReportsPage';
import AdminAuditLogsPage from '../pages/admin/AdminAuditLogsPage';

export default function AppRoutes() {
  return (
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
            <RoleRoute roles={['CUSTOMER']}>
              <CheckoutPage />
            </RoleRoute>
          }
        />
        <Route
          path="booking/:bookingId"
          element={
            <RoleRoute roles={['CUSTOMER', 'ADMIN']}>
              <BookingDetailPage />
            </RoleRoute>
          }
        />
        <Route
          path="booking-success"
          element={
            <RoleRoute roles={['CUSTOMER']}>
              <BookingSuccessPage />
            </RoleRoute>
          }
        />
        <Route
          path="my-bookings"
          element={
            <RoleRoute roles={['CUSTOMER']}>
              <MyBookingsPage />
            </RoleRoute>
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
      </Route>

      <Route
        path="driver"
        element={
          <RoleRoute roles={['DRIVER']}>
            <DriverLayout />
          </RoleRoute>
        }
      >
        <Route index element={<DriverDashboardPage />} />
        <Route path="rides" element={<DriverRidesPage />} />
        <Route path="rides/:rideId" element={<DriverRideDetailPage />} />
        <Route path="rides/:rideId/passengers" element={<DriverPassengersPage />} />
      </Route>

      <Route
        path="admin"
        element={
          <RoleRoute roles={['ADMIN']}>
            <AdminLayout />
          </RoleRoute>
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
  );
}

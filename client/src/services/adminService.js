import { api } from './api';

export const adminService = {
  dashboard() {
    return api.get('/admin/dashboard').then((r) => r.data.data);
  },

  // Users
  listUsers(params) {
    return api.get('/admin/users', { params }).then((r) => r.data.data);
  },
  getUser(id) {
    return api.get(`/admin/users/${id}`).then((r) => r.data.data);
  },
  updateUserStatus(id, status) {
    return api.patch(`/admin/users/${id}/status`, { status }).then((r) => r.data.data);
  },

  // Drivers
  listDrivers(params) {
    return api.get('/admin/drivers', { params }).then((r) => r.data.data);
  },
  createDriver(payload) {
    return api.post('/admin/drivers', payload).then((r) => r.data.data);
  },
  getDriver(id) {
    return api.get(`/admin/drivers/${id}`).then((r) => r.data.data);
  },
  updateDriver(id, payload) {
    return api.patch(`/admin/drivers/${id}`, payload).then((r) => r.data.data);
  },

  // Vehicles
  listVehicles(params) {
    return api.get('/admin/vehicles', { params }).then((r) => r.data.data);
  },
  createVehicle(payload) {
    return api.post('/admin/vehicles', payload).then((r) => r.data.data);
  },
  getVehicle(id) {
    return api.get(`/admin/vehicles/${id}`).then((r) => r.data.data);
  },
  updateVehicle(id, payload) {
    return api.patch(`/admin/vehicles/${id}`, payload).then((r) => r.data.data);
  },

  // Routes
  listRoutes(params) {
    return api.get('/admin/routes', { params }).then((r) => r.data.data);
  },
  createRoute(payload) {
    return api.post('/admin/routes', payload).then((r) => r.data.data);
  },
  updateRoute(id, payload) {
    return api.patch(`/admin/routes/${id}`, payload).then((r) => r.data.data);
  },

  // Rides
  listRides(params) {
    return api.get('/admin/rides', { params }).then((r) => r.data.data);
  },
  createRide(payload) {
    return api.post('/admin/rides', payload).then((r) => r.data.data);
  },
  getRide(id) {
    return api.get(`/admin/rides/${id}`).then((r) => r.data.data);
  },
  updateRide(id, payload) {
    return api.patch(`/admin/rides/${id}`, payload).then((r) => r.data.data);
  },
  cancelRide(id) {
    return api.patch(`/admin/rides/${id}`, { status: 'CANCELLED' }).then((r) => r.data.data);
  },

  // Bookings / Payments
  listBookings(params) {
    return api.get('/admin/bookings', { params }).then((r) => r.data.data);
  },
  getBooking(id) {
    return api.get(`/admin/bookings/${id}`).then((r) => r.data.data);
  },
  listPayments(params) {
    return api.get('/admin/payments', { params }).then((r) => r.data.data);
  },
  getPayment(id) {
    return api.get(`/admin/payments/${id}`).then((r) => r.data.data);
  },

  // Reports
  revenueReport(params) {
    return api.get('/admin/reports/revenue', { params }).then((r) => r.data.data);
  },
  bookingsReport(params) {
    return api.get('/admin/reports/bookings', { params }).then((r) => r.data.data);
  },
  ridesReport(params) {
    return api.get('/admin/reports/rides', { params }).then((r) => r.data.data);
  },

  // Audit
  auditLogs(params) {
    return api.get('/admin/audit-logs', { params }).then((r) => r.data.data);
  },
};

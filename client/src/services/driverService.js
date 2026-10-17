import { api } from './api';

export const driverService = {
  dashboard() {
    return api.get('/driver/dashboard').then((r) => r.data.data);
  },
  todayReport(params) {
    return api.get('/driver/dashboard/today', { params }).then((r) => r.data.data);
  },
  listRides(params) {
    return api.get('/driver/rides', { params }).then((r) => r.data.data);
  },
  getRide(rideId) {
    return api.get(`/driver/rides/${rideId}`).then((r) => r.data.data);
  },
  getPassengers(rideId) {
    return api.get(`/driver/rides/${rideId}/passengers`).then((r) => r.data.data);
  },
  listPassengers(params) {
    return api.get('/driver/passengers', { params }).then((r) => r.data.data);
  },
  addPassenger(rideId, payload) {
    return api.post(`/driver/rides/${rideId}/passengers`, payload).then((r) => r.data.data);
  },
  updatePassenger(passengerId, payload) {
    return api.patch(`/driver/passengers/${passengerId}`, payload).then((r) => r.data.data);
  },
  updateStatus(rideId, status) {
    return api.patch(`/driver/rides/${rideId}/status`, { status }).then((r) => r.data.data);
  },
  voidRide(rideId, reason) {
    return api.post(`/driver/rides/${rideId}/void`, { reason }).then((r) => r.data.data);
  },
  searchLocations(q) {
    return api.get('/locations', { params: { q } }).then((r) => r.data.data);
  },
  createLocation(payload) {
    return api.post('/locations', payload).then((r) => r.data.data);
  },
  listVehicles() {
    return api.get('/driver/vehicles').then((r) => r.data.data);
  },
  createVehicle(payload) {
    return api.post('/driver/vehicles', payload).then((r) => r.data.data);
  },
  updateVehicle(vehicleId, payload) {
    return api.patch(`/driver/vehicles/${vehicleId}`, payload).then((r) => r.data.data);
  },
  deactivateVehicle(vehicleId) {
    return api.delete(`/driver/vehicles/${vehicleId}`).then((r) => r.data.data);
  },
  listRoutes() {
    return api.get('/driver/routes').then((r) => r.data.data);
  },
  listAvailableRoutes() {
    return api.get('/driver/routes/available').then((r) => r.data.data);
  },
  createRoute(payload) {
    return api.post('/driver/routes', payload).then((r) => r.data.data);
  },
  updateRoute(routeId, payload) {
    return api.patch(`/driver/routes/${routeId}`, payload).then((r) => r.data.data);
  },
  deactivateRoute(routeId) {
    return api.delete(`/driver/routes/${routeId}`).then((r) => r.data.data);
  },
  listLocations() {
    return api.get('/locations').then((r) => r.data.data);
  },
  createRide(payload) {
    return api.post('/driver/rides', payload).then((r) => r.data.data);
  },
  updateRide(rideId, payload) {
    return api.patch(`/driver/rides/${rideId}`, payload).then((r) => r.data.data);
  },
  paymentDetails() {
    return api.get('/driver/payment-details').then((r) => r.data.data);
  },
  updatePaymentDetails(payload) {
    return api.patch('/driver/payment-details', payload).then((r) => r.data.data);
  },
  listBookings(params) {
    return api.get('/driver/bookings', { params }).then((r) => r.data.data);
  },
  listRefunds(params) {
    return api.get('/driver/refunds', { params }).then((r) => r.data.data);
  },
  markRefund(bookingId, payload) {
    return api.post(`/driver/bookings/${bookingId}/refund`, payload).then((r) => r.data.data);
  },
  addVehicleImage(vehicleId, image) {
    return api.post(`/driver/vehicles/${vehicleId}/images`, { image }).then((r) => r.data.data);
  },
  removeVehicleImage(vehicleId, imageId) {
    return api.delete(`/driver/vehicles/${vehicleId}/images/${imageId}`).then((r) => r.data.data);
  },
  reviewPayment(bookingId, payload) {
    return api.post(`/driver/bookings/${bookingId}/review`, payload).then((r) => r.data.data);
  },
};

import { api } from './api';

export const driverService = {
  dashboard() {
    return api.get('/driver/dashboard').then((r) => r.data.data);
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
  updateStatus(rideId, status) {
    return api
      .patch(`/driver/rides/${rideId}/status`, { status })
      .then((r) => r.data.data);
  },
  listVehicles() {
    return api.get('/driver/vehicles').then((r) => r.data.data);
  },
  createVehicle(payload) {
    return api.post('/driver/vehicles', payload).then((r) => r.data.data);
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

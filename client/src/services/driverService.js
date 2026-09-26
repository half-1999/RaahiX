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
};

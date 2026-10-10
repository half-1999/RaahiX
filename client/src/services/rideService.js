import { api } from './api';

export const rideService = {
  catalog() {
    return api.get('/rides/catalog').then((r) => r.data.data);
  },
  search(params) {
    return api.get('/rides/search', { params }).then((r) => r.data.data);
  },
  getById(rideId) {
    return api.get(`/rides/${rideId}`).then((r) => r.data.data);
  },
  getSeats(rideId) {
    return api.get(`/rides/${rideId}/seats`).then((r) => r.data.data);
  },
};

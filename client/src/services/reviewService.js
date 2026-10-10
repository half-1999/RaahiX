import { api } from './api';

export const reviewService = {
  list(vehicleId) {
    return api.get(`/vehicles/${vehicleId}/reviews`).then((r) => r.data.data);
  },
  eligibility(vehicleId) {
    return api.get(`/vehicles/${vehicleId}/reviews/eligibility`).then((r) => r.data.data);
  },
  create(vehicleId, payload) {
    return api.post(`/vehicles/${vehicleId}/reviews`, payload).then((r) => r.data.data);
  },
};

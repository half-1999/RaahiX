import { api } from './api';

export const bookingService = {
  hold(payload) {
    return api.post('/bookings/hold', payload).then((r) => r.data.data);
  },
  create(payload) {
    return api.post('/bookings', payload).then((r) => r.data.data);
  },
  list() {
    return api.get('/bookings').then((r) => r.data.data);
  },
  getById(bookingId) {
    return api.get(`/bookings/${bookingId}`).then((r) => r.data.data);
  },
  cancel(bookingId, reason) {
    return api
      .post(`/bookings/${bookingId}/cancel`, { reason })
      .then((r) => r.data.data);
  },
};

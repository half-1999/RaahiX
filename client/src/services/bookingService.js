import { api } from './api';

export const bookingService = {
  hold(payload) {
    return api.post('/bookings/hold', payload).then((r) => r.data.data);
  },
  create(payload) {
    return api.post('/bookings', payload).then((r) => r.data.data);
  },
  list(params) {
    return api.get('/bookings', { params }).then((r) => r.data.data);
  },
  getById(bookingId) {
    return api.get(`/bookings/${bookingId}`).then((r) => r.data.data);
  },
  cancel(bookingId, reason) {
    return api
      .post(`/bookings/${bookingId}/cancel`, { reason })
      .then((r) => r.data.data);
  },
  submitProof(bookingId, payload) {
    return api.post(`/bookings/${bookingId}/payment-proof`, payload).then((r) => r.data.data);
  },
  async proofUrl(bookingId) {
    const response = await api.get(`/bookings/${bookingId}/proof`, { responseType: 'blob' });
    return URL.createObjectURL(response.data);
  },
};

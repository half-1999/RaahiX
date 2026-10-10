import { api } from './api';

export const notificationService = {
  list() {
    return api.get('/notifications').then((r) => r.data.data);
  },
  markRead(id) {
    return api.patch(`/notifications/${id}/read`).then((r) => r.data.data);
  },
};

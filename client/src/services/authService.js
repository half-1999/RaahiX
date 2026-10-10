import { api } from './api';

export const authService = {
  register(payload) {
    return api.post('/auth/register', payload).then((r) => r.data.data);
  },
  registerDriver(payload) {
    return api.post('/auth/register-driver', payload).then((r) => r.data.data);
  },
  login(payload) {
    return api.post('/auth/login', payload).then((r) => r.data.data);
  },
  refresh(refreshToken) {
    return api.post('/auth/refresh', { refreshToken }).then((r) => r.data.data);
  },
  logout(refreshToken) {
    return api.post('/auth/logout', { refreshToken }).then((r) => r.data.data);
  },
  me() {
    return api.get('/auth/me').then((r) => r.data.data);
  },
  updateProfile(payload) {
    return api.patch('/auth/me', payload).then((r) => r.data.data);
  },
};

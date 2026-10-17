const USER_KEY = 'user';
const ACCESS_KEY = 'accessToken';
const REFRESH_KEY = 'refreshToken';

/** Fired when tokens are wiped (e.g. refresh 401 after reseed) so AuthContext can sync. */
export const SESSION_CLEARED_EVENT = 'raahix:session-cleared';

export function getStoredUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setSession({ user, accessToken, refreshToken }) {
  if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
  if (accessToken) localStorage.setItem(ACCESS_KEY, accessToken);
  if (refreshToken) localStorage.setItem(REFRESH_KEY, refreshToken);
}

export function clearSession({ notify = true } = {}) {
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
  if (notify && typeof window !== 'undefined') {
    window.dispatchEvent(new Event(SESSION_CLEARED_EVENT));
  }
}

export function getAccessToken() {
  return localStorage.getItem(ACCESS_KEY);
}

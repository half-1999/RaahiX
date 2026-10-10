import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authService } from '../services/authService';
import {
  clearSession,
  getAccessToken,
  getStoredUser,
  setSession,
} from '../store/authStore';

const AuthContext = createContext(null);

function unwrapUser(payload) {
  if (!payload) return null;
  if (payload.user && (payload.user.id || payload.user._id || payload.user.email)) {
    return payload.user;
  }
  return payload;
}

function isAuthFailure(err) {
  const status = err?.response?.status;
  return status === 401 || status === 403;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => unwrapUser(getStoredUser()));
  const [loading, setLoading] = useState(() => Boolean(getAccessToken()));

  const applySession = useCallback((data) => {
    const nextUser = unwrapUser(data.user || data);
    setSession({
      user: nextUser,
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
    });
    setUser(nextUser);
    return nextUser;
  }, []);

  const refreshMe = useCallback(async () => {
    const token = getAccessToken();
    if (!token) {
      setUser(null);
      setLoading(false);
      return null;
    }
    try {
      const me = await authService.me();
      const nextUser = unwrapUser(me);
      setSession({ user: nextUser });
      setUser(nextUser);
      return nextUser;
    } catch (err) {
      // Keep local session on network / 5xx so users are not forced to re-login.
      if (isAuthFailure(err)) {
        clearSession();
        setUser(null);
        return null;
      }
      const cached = unwrapUser(getStoredUser());
      if (cached) setUser(cached);
      return cached;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshMe();
  }, [refreshMe]);

  const login = useCallback(
    async (payload) => {
      const data = await authService.login(payload);
      return applySession(data);
    },
    [applySession]
  );

  const register = useCallback(
    async (payload) => {
      const data = await authService.register(payload);
      return applySession(data);
    },
    [applySession]
  );

  const registerDriver = useCallback(
    async (payload) => {
      const data = await authService.registerDriver(payload);
      return applySession(data);
    },
    [applySession]
  );

  const updateProfile = useCallback(async (payload) => {
    const data = await authService.updateProfile(payload);
    const nextUser = unwrapUser(data);
    setSession({ user: nextUser });
    setUser(nextUser);
    return nextUser;
  }, []);

  const logout = useCallback(async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      await authService.logout(refreshToken);
    } catch {
      // ignore network logout failures
    } finally {
      clearSession();
      setUser(null);
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      isAuthenticated: Boolean(user && getAccessToken()),
      login,
      register,
      registerDriver,
      updateProfile,
      logout,
      refreshMe,
      setUser,
    }),
    [user, loading, login, register, registerDriver, updateProfile, logout, refreshMe]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import * as authService from '../services/authService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Guards against out-of-order responses: the mount-time refresh() call
  // (GET /me, sent before any session cookie exists, so it always 401s at
  // first) can still be in flight when the user submits the login form.
  // Without this guard, that now-stale response can resolve AFTER login()
  // has set the correct authenticated state and wipe it back to null —
  // which looked like "first login attempt bounces back to the login
  // page, second attempt works." Bumping this counter at the start of
  // every auth operation invalidates any earlier in-flight call so its
  // result is discarded instead of applied.
  const requestIdRef = useRef(0);

  const refresh = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    try {
      const res = await authService.fetchMe();
      if (requestId !== requestIdRef.current) return;
      setUser(res.data.data.user);
      setProfile(res.data.data.profile);
    } catch {
      if (requestId !== requestIdRef.current) return;
      setUser(null);
      setProfile(null);
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = async (email, password) => {
    const requestId = ++requestIdRef.current;
    await authService.login(email, password);
    // Re-fetch the authoritative user/profile from the server immediately
    // after login instead of trusting the login response in isolation —
    // guarantees the temporaryPassword flag (and everything else) reflects
    // the current database state, with no stale client-side value able to
    // linger and cause an incorrect redirect.
    const me = await authService.fetchMe();
    if (requestId === requestIdRef.current) {
      setUser(me.data.data.user);
      setProfile(me.data.data.profile);
    }
    return me.data.data.user;
  };

  const logout = async () => {
    requestIdRef.current += 1;
    try {
      await authService.logout();
    } finally {
      setUser(null);
      setProfile(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, login, logout, refresh, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

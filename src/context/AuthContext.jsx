import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { tokenStore } from '../services/api.js';
import { authApi } from '../services/readingApi.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(() => Boolean(tokenStore.get()));

  useEffect(() => {
    if (!tokenStore.get()) return;
    let alive = true;
    authApi.me()
      .then(({ user }) => alive && setUser(user))
      .catch(() => alive && setUser(null))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, []);

  // The API client fires this when any request comes back 401 (expired / invalid token).
  useEffect(() => {
    const onUnauthorized = () => setUser(null);
    window.addEventListener('tb:unauthorized', onUnauthorized);
    return () => window.removeEventListener('tb:unauthorized', onUnauthorized);
  }, []);

  const finish = useCallback(({ token, user }) => {
    tokenStore.set(token);
    setUser(user);
    return user;
  }, []);

  const value = useMemo(() => ({
    user,
    loading,
    isAdmin: user?.role === 'ADMIN',
    login: async (email, password) => finish(await authApi.login(email, password)),
    register: async (name, email, phone, password) => finish(await authApi.register(name, email, phone, password)),
    logout: () => { tokenStore.clear(); setUser(null); },
  }), [user, loading, finish]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi } from '../services/api';
import { connectSocket, disconnectSocket } from '../services/socket';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadUser = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const data = await authApi.getMe();
      setUser(data);
      connectSocket();
    } catch {
      localStorage.removeItem('token');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadUser(); }, [loadUser]);

  const login = async (credentials) => {
    const { token, user } = await authApi.login(credentials);
    localStorage.setItem('token', token);
    setUser(user);
    connectSocket();
  };

  const register = async (data) => {
    const { token, user } = await authApi.register(data);
    localStorage.setItem('token', token);
    setUser(user);
    connectSocket();
  };

  const googleLogin = async (idToken) => {
    const { token, user } = await authApi.googleLogin(idToken);
    localStorage.setItem('token', token);
    setUser(user);
    connectSocket();
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    disconnectSocket();
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, googleLogin, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

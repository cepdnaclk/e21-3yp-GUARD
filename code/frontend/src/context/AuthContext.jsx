import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi } from '../services/api';
import { connectSocket, disconnectSocket } from '../services/socket';

const AuthContext = createContext(null);
const TOKEN_KEY = 'token';
const ROLE_KEY = 'role';
const USER_KEY = 'auth_user';

function normalizeUserFromAuthResponse(data, fallback = {}) {
  if (data?.user) {
    return {
      ...data.user,
      role: data.user.role ?? data.role ?? fallback.role ?? null,
      fullName: data.user.fullName ?? data.fullName ?? fallback.fullName ?? '',
      username: data.user.username ?? fallback.username ?? '',
    };
  }

  return {
    username: data?.username ?? fallback.username ?? '',
    fullName: data?.fullName ?? fallback.fullName ?? '',
    role: data?.role ?? fallback.role ?? null,
  };
}

function parseJwtPayload(token) {
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(base64));
  } catch {
    return null;
  }
}

function isTokenExpired(token) {
  const payload = parseJwtPayload(token);
  if (!payload?.exp) return false;
  return payload.exp * 1000 <= Date.now();
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadUser = useCallback(async () => {
    const token = localStorage.getItem(TOKEN_KEY);
    const storedRole = localStorage.getItem(ROLE_KEY);
    const storedUserRaw = localStorage.getItem(USER_KEY);
    if (!token) {
      setLoading(false);
      return;
    }

    if (isTokenExpired(token)) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(ROLE_KEY);
      localStorage.removeItem(USER_KEY);
      setUser(null);
      setLoading(false);
      return;
    }

    let storedUser = null;
    if (storedUserRaw) {
      try {
        storedUser = JSON.parse(storedUserRaw);
      } catch {
        storedUser = null;
      }
    }

    try {
      const data = await authApi.getMe();
      const nextUser = normalizeUserFromAuthResponse(data, { ...(storedUser || {}), role: storedRole });
      setUser(nextUser);
      if (nextUser.role) localStorage.setItem(ROLE_KEY, nextUser.role);
      localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
      connectSocket();
    } catch {
      if (storedUser) {
        setUser(storedUser);
        if (storedUser.role) localStorage.setItem(ROLE_KEY, storedUser.role);
        connectSocket();
      } else {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(ROLE_KEY);
        localStorage.removeItem(USER_KEY);
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadUser(); }, [loadUser]);

  const login = async (credentials) => {
    const authData = await authApi.login(credentials);
    if (!authData?.token) throw new Error('Login succeeded but token is missing.');

    localStorage.setItem(TOKEN_KEY, authData.token);

    let nextUser = normalizeUserFromAuthResponse(authData, {
      username: credentials.username,
      role: authData.role,
      fullName: authData.fullName,
    });

    try {
      const me = await authApi.getMe();
      nextUser = normalizeUserFromAuthResponse(me, nextUser);
    } catch {
      // Keep the lightweight user payload if /auth/me is unavailable.
    }

    if (nextUser.role) localStorage.setItem(ROLE_KEY, nextUser.role);
    localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
    setUser(nextUser);
    connectSocket();
  };

  const register = async (data) => {
    const authData = await authApi.register(data);
    if (!authData?.token) throw new Error('Registration succeeded but token is missing.');
    localStorage.setItem(TOKEN_KEY, authData.token);

    const nextUser = normalizeUserFromAuthResponse(authData, {
      username: data.username,
      role: authData.role,
      fullName: authData.fullName,
    });

    if (nextUser.role) localStorage.setItem(ROLE_KEY, nextUser.role);
    localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
    setUser(nextUser);
    connectSocket();
  };

  const googleLogin = async (idToken) => {
    const authData = await authApi.googleLogin(idToken);
    if (!authData?.token) throw new Error('Google login succeeded but token is missing.');
    localStorage.setItem(TOKEN_KEY, authData.token);

    const nextUser = normalizeUserFromAuthResponse(authData, {
      role: authData.role,
      fullName: authData.fullName,
    });

    if (nextUser.role) localStorage.setItem(ROLE_KEY, nextUser.role);
    localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
    setUser(nextUser);
    connectSocket();
  };

  const updateProfile = async (profileData) => {
    const updatedUser = await authApi.updateProfile(profileData);
    setUser(updatedUser);
    return updatedUser;
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(ROLE_KEY);
    localStorage.removeItem(USER_KEY);
    setUser(null);
    disconnectSocket();
  };

  const role = user?.role || localStorage.getItem(ROLE_KEY) || null;
  const hasRole = (allowedRoles = []) => {
    if (!role) return false;
    return allowedRoles.includes(role);
  };

  return (
    <AuthContext.Provider value={{ user, role, hasRole, loading, login, register, googleLogin, updateProfile, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

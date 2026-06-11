import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi } from '../services/api';
import { connectSocket, disconnectSocket } from '../services/socket';
import { useTheme } from './ThemeContext';

const AuthContext = createContext(null);
const TOKEN_KEY = 'token';
const ROLE_KEY = 'role';

function normalizeUserFromAuthResponse(data, fallback = {}) {
  if (data?.user) {
    return {
      ...data.user,
      id: data.user.id ?? fallback.id,
      email: data.user.email ?? data.email ?? fallback.email ?? '',
      address: data.user.address ?? data.address ?? fallback.address ?? '',
      phoneNumber: data.user.phoneNumber ?? data.phoneNumber ?? fallback.phoneNumber ?? '',
      profilePicture: data.user.profilePicture ?? data.profilePicture ?? fallback.profilePicture ?? null,
      phoneVerified: data.user.phoneVerified ?? data.phoneVerified ?? fallback.phoneVerified ?? false,
      telegramChatId: data.user.telegramChatId ?? data.telegramChatId ?? fallback.telegramChatId ?? null,
      createdAt: data.user.createdAt ?? data.createdAt ?? fallback.createdAt ?? null,
      role: data.user.role ?? data.role ?? fallback.role ?? null,
      fullName: data.user.fullName ?? data.fullName ?? fallback.fullName ?? '',
      username: data.user.username ?? fallback.username ?? '',
    };
  }

  return {
    id: data?.id ?? fallback.id,
    username: data?.username ?? fallback.username ?? '',
    email: data?.email ?? fallback.email ?? '',
    fullName: data?.fullName ?? fallback.fullName ?? '',
    address: data?.address ?? fallback.address ?? '',
    phoneNumber: data?.phoneNumber ?? fallback.phoneNumber ?? '',
    profilePicture: data?.profilePicture ?? fallback.profilePicture ?? null,
    phoneVerified: data?.phoneVerified ?? fallback.phoneVerified ?? false,
    telegramChatId: data?.telegramChatId ?? fallback.telegramChatId ?? null,
    createdAt: data?.createdAt ?? fallback.createdAt ?? null,
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
  const { resetTheme } = useTheme();

  const loadUser = useCallback(async () => {
    const token = localStorage.getItem(TOKEN_KEY);
    const storedRole = localStorage.getItem(ROLE_KEY);
    if (!token) {
      setLoading(false);
      return;
    }

    if (isTokenExpired(token)) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(ROLE_KEY);
      localStorage.removeItem('auth_user');
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const data = await authApi.getMe();
      const nextUser = normalizeUserFromAuthResponse(data, { role: storedRole });
      setUser(nextUser);
      if (nextUser.role) localStorage.setItem(ROLE_KEY, nextUser.role);
      localStorage.removeItem('auth_user');
      connectSocket();
    } catch {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(ROLE_KEY);
      localStorage.removeItem('auth_user');
      setUser(null);
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
    localStorage.removeItem('auth_user');
    setUser(nextUser);
    connectSocket();
  };

  const register = async (data) => {
    const authData = await authApi.register(data);

    // Email verification required — backend returns no token yet.
    // Return the response so the UI can show the "check your inbox" screen.
    if (authData?.emailVerified === false) {
      return authData; // { message, emailVerified: false, user }
    }

    // No real email / @local.guard fallback — backend returns a token immediately.
    if (!authData?.token) throw new Error('Registration failed: unexpected response from server.');
    localStorage.setItem(TOKEN_KEY, authData.token);

    const nextUser = normalizeUserFromAuthResponse(authData, {
      username: data.username,
      role: authData.role,
      fullName: authData.fullName,
    });

    if (nextUser.role) localStorage.setItem(ROLE_KEY, nextUser.role);
    localStorage.removeItem('auth_user');
    setUser(nextUser);
    connectSocket();
    return authData;
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
    localStorage.removeItem('auth_user');
    setUser(nextUser);
    connectSocket();
  };

  const updateProfile = async (profileData) => {
    const updatedData = await authApi.updateProfile(profileData);
    const nextUser = normalizeUserFromAuthResponse(updatedData, user || {});

    if (nextUser.role) localStorage.setItem(ROLE_KEY, nextUser.role);
    localStorage.removeItem('auth_user');
    setUser(nextUser);
    return nextUser;
  };

  const refreshUser = async () => {
    const data = await authApi.getMe();
    const nextUser = normalizeUserFromAuthResponse(data, user || {});

    if (nextUser.role) localStorage.setItem(ROLE_KEY, nextUser.role);
    localStorage.removeItem('auth_user');
    setUser(nextUser);
    return nextUser;
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(ROLE_KEY);
    localStorage.removeItem('auth_user');
    resetTheme();
    setUser(null);
    disconnectSocket();
  };

  const role = user?.role || localStorage.getItem(ROLE_KEY) || null;
  const hasRole = (allowedRoles = []) => {
    if (!role) return false;
    return allowedRoles.includes(role);
  };

  return (
    <AuthContext.Provider value={{ user, role, hasRole, loading, login, register, googleLogin, updateProfile, refreshUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

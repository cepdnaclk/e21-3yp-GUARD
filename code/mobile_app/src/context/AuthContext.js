import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authApi } from '../services/api';
import { connectSocket, disconnectSocket } from '../services/socket';

const AuthContext = createContext(null);
const TOKEN_KEY = 'token';
const ROLE_KEY = 'role';

function normalizeUserFromAuthResponse(data, fallback = {}) {
  if (data?.user) {
    return {
      ...data.user,
      id: data.user.id ?? fallback.id,
      email: data.user.email ?? data.email ?? fallback.email ?? '',
      fullName: data.user.fullName ?? data.fullName ?? fallback.fullName ?? '',
      username: data.user.username ?? fallback.username ?? '',
      role: data.user.role ?? data.role ?? fallback.role ?? null,
    };
  }

  return {
    id: data?.id ?? fallback.id,
    username: data?.username ?? fallback.username ?? '',
    email: data?.email ?? fallback.email ?? '',
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
  const [roleState, setRoleState] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadUser = useCallback(async () => {
    const token = await AsyncStorage.getItem(TOKEN_KEY);
    const storedRole = await AsyncStorage.getItem(ROLE_KEY);
    if (!token) {
      setLoading(false);
      return;
    }

    if (isTokenExpired(token)) {
      await AsyncStorage.multiRemove([TOKEN_KEY, ROLE_KEY]);
      setUser(null);
      setRoleState(null);
      setLoading(false);
      return;
    }

    try {
      const data = await authApi.getMe();
      const nextUser = normalizeUserFromAuthResponse(data, { role: storedRole });
      setUser(nextUser);
      if (nextUser.role) {
        await AsyncStorage.setItem(ROLE_KEY, nextUser.role);
        setRoleState(nextUser.role);
      }
      connectSocket();
    } catch {
      await AsyncStorage.multiRemove([TOKEN_KEY, ROLE_KEY]);
      setUser(null);
      setRoleState(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadUser(); }, [loadUser]);

  const login = async (credentials) => {
    const authData = await authApi.login(credentials);
    if (!authData?.token) throw new Error('Login succeeded but token is missing.');

    await AsyncStorage.setItem(TOKEN_KEY, authData.token);

    let nextUser = normalizeUserFromAuthResponse(authData, {
      username: credentials.username,
      role: authData.role,
      fullName: authData.fullName,
    });

    if (nextUser.role) {
      await AsyncStorage.setItem(ROLE_KEY, nextUser.role);
      setRoleState(nextUser.role);
    }
    
    setUser(nextUser);
    connectSocket();
  };

  const logout = async () => {
    await AsyncStorage.multiRemove([TOKEN_KEY, ROLE_KEY]);
    setUser(null);
    setRoleState(null);
    disconnectSocket();
  };

  const role = user?.role || roleState || null;
  const hasRole = (allowedRoles = []) => {
    if (!role) return false;
    return allowedRoles.includes(role);
  };

  return (
    <AuthContext.Provider value={{ user, role, hasRole, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

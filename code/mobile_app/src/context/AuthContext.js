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
      address: data.user.address ?? data.address ?? fallback.address ?? '',
      phoneNumber: data.user.phoneNumber ?? data.phoneNumber ?? fallback.phoneNumber ?? '',
      profilePicture: data.user.profilePicture ?? data.profilePicture ?? fallback.profilePicture ?? null,
      phoneVerified: data.user.phoneVerified ?? data.phoneVerified ?? fallback.phoneVerified ?? false,
      emailVerified: data.user.emailVerified ?? data.emailVerified ?? fallback.emailVerified ?? false,
      telegramVerified: data.user.telegramVerified ?? data.telegramVerified ?? fallback.telegramVerified ?? false,
      telegramChatId: data.user.telegramChatId ?? data.telegramChatId ?? fallback.telegramChatId ?? null,
      createdAt: data.user.createdAt ?? data.createdAt ?? fallback.createdAt ?? null,
      role: data.user.role ?? data.role ?? fallback.role ?? null,
      fullName: data.user.fullName ?? data.fullName ?? fallback.fullName ?? '',
      username: data.user.username ?? fallback.username ?? '',
      emailAlertsEnabled: data.user.emailAlertsEnabled ?? data.emailAlertsEnabled ?? fallback.emailAlertsEnabled ?? true,
      telegramAlertsEnabled: data.user.telegramAlertsEnabled ?? data.telegramAlertsEnabled ?? fallback.telegramAlertsEnabled ?? true,
    };
  }

  return {
    ...data,
    id: data?.id ?? fallback.id,
    username: data?.username ?? fallback.username ?? '',
    email: data?.email ?? fallback.email ?? '',
    fullName: data?.fullName ?? fallback.fullName ?? '',
    address: data?.address ?? fallback.address ?? '',
    phoneNumber: data?.phoneNumber ?? fallback.phoneNumber ?? '',
    profilePicture: data?.profilePicture ?? fallback.profilePicture ?? null,
    phoneVerified: data?.phoneVerified ?? fallback.phoneVerified ?? false,
    emailVerified: data?.emailVerified ?? fallback.emailVerified ?? false,
    telegramVerified: data?.telegramVerified ?? fallback.telegramVerified ?? false,
    telegramChatId: data?.telegramChatId ?? fallback.telegramChatId ?? null,
    createdAt: data?.createdAt ?? fallback.createdAt ?? null,
    role: data?.role ?? fallback.role ?? null,
    emailAlertsEnabled: data?.emailAlertsEnabled ?? data.user?.emailAlertsEnabled ?? fallback.emailAlertsEnabled ?? true,
    telegramAlertsEnabled: data?.telegramAlertsEnabled ?? data.user?.telegramAlertsEnabled ?? fallback.telegramAlertsEnabled ?? true,
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

    try {
      const me = await authApi.getMe();
      nextUser = normalizeUserFromAuthResponse(me, nextUser);
    } catch {
      // Keep lightweight payload if /auth/me fails
    }

    if (nextUser.role) {
      await AsyncStorage.setItem(ROLE_KEY, nextUser.role);
      setRoleState(nextUser.role);
    }

    setUser(nextUser);
    connectSocket();
  };

  const refreshUser = async () => {
    try {
      const data = await authApi.getMe();
      const nextUser = normalizeUserFromAuthResponse(data, user || {});
      setUser(nextUser);
      if (nextUser.role) {
        await AsyncStorage.setItem(ROLE_KEY, nextUser.role);
        setRoleState(nextUser.role);
      }
    } catch (err) {
      console.log('Failed to refresh user:', err.message);
    }
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
    <AuthContext.Provider value={{ user, role, hasRole, loading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

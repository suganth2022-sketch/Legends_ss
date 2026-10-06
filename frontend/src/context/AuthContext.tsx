'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { apiClient } from '@/lib/apiClient';

export type UserType = 'MEMBER' | 'ADMIN';

export interface AuthUser {
  id: string;
  userType: UserType;
  fullName: string;
  email: string;
  roleName?: string;
  // Member-only
  memberCode?: string;
  phone?: string;
  status?: string;
  // Admin-only
  username?: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  userType: UserType | null;
  isAuthenticated: boolean;
  loading: boolean;
  loginMember: (identifier: string, password: string) => Promise<void>;
  loginAdmin: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const hydrate = useCallback(async () => {
    try {
      const { data } = await apiClient.get<AuthUser>('/auth/me');
      setUser(data);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    hydrate();

    const onLogout = () => setUser(null);
    window.addEventListener('legends:logout', onLogout);
    return () => window.removeEventListener('legends:logout', onLogout);
  }, [hydrate]);

  // Login/logout hit dedicated Next route handlers that own the httpOnly cookies.
  const loginMember = useCallback(async (identifier: string, password: string) => {
    const { data } = await apiClient.post('/api/auth/login', { kind: 'MEMBER', identifier, password }, { baseURL: '' });
    setUser(data.user);
  }, []);

  const loginAdmin = useCallback(async (username: string, password: string) => {
    const { data } = await apiClient.post('/api/auth/login', { kind: 'ADMIN', username, password }, { baseURL: '' });
    setUser(data.user);
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    apiClient.post('/api/auth/logout', undefined, { baseURL: '' }).finally(() => {
      window.location.assign('/login');
    });
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        userType: user?.userType ?? null,
        isAuthenticated: !!user,
        loading,
        loginMember,
        loginAdmin,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}

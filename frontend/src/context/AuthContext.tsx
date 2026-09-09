import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { apiClient, tokenStorage } from '../lib/apiClient';

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
    if (!tokenStorage.getAccessToken()) {
      setLoading(false);
      return;
    }
    try {
      const { data } = await apiClient.get<AuthUser>('/auth/me');
      setUser(data);
    } catch {
      tokenStorage.clear();
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

  const loginMember = useCallback(async (identifier: string, password: string) => {
    const { data } = await apiClient.post('/auth/login', { identifier, password });
    tokenStorage.setTokens(data.accessToken, data.refreshToken);
    setUser({ ...data.user, userType: 'MEMBER' });
  }, []);

  const loginAdmin = useCallback(async (username: string, password: string) => {
    const { data } = await apiClient.post('/auth/admin/login', { username, password });
    tokenStorage.setTokens(data.accessToken, data.refreshToken);
    setUser({ ...data.user, userType: 'ADMIN' });
  }, []);

  const logout = useCallback(() => {
    tokenStorage.clear();
    setUser(null);
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

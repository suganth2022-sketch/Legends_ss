'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, type UserType } from '@/context/AuthContext';

export const RequireAuth: React.FC<{ userType: UserType; children: React.ReactNode }> = ({ userType, children }) => {
  const { isAuthenticated, userType: current, loading } = useAuth();
  const router = useRouter();
  const allowed = isAuthenticated && current === userType;

  useEffect(() => {
    if (!loading && !allowed) router.replace('/login');
  }, [loading, allowed, router]);

  if (loading || !allowed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-paper">
        <div className="text-ink-soft text-sm">Loading&hellip;</div>
      </div>
    );
  }

  return <>{children}</>;
};

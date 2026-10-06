'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function HomePage() {
  const { isAuthenticated, userType, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) router.replace('/login');
    else router.replace(userType === 'ADMIN' ? '/admin/dashboard' : '/member/dashboard');
  }, [loading, isAuthenticated, userType, router]);

  return null;
}

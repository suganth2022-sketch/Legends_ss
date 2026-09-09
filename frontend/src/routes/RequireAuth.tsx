import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth, type UserType } from '../context/AuthContext';

export const RequireAuth: React.FC<{ userType: UserType }> = ({ userType }) => {
  const { isAuthenticated, userType: currentUserType, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-paper">
        <div className="text-ink-soft text-sm">Loading&hellip;</div>
      </div>
    );
  }

  if (!isAuthenticated || currentUserType !== userType) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

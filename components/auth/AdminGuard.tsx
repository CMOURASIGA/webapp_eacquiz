import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { isAdminAuthenticated } from '../../utils/adminAuth';

interface AdminGuardProps {
  children: React.ReactNode;
}

export const AdminGuard: React.FC<AdminGuardProps> = ({ children }) => {
  const location = useLocation();

  if (isAdminAuthenticated()) {
    return <>{children}</>;
  }

  const nextPath = `${location.pathname}${location.search}${location.hash}`;
  const encodedNext = encodeURIComponent(nextPath);

  return <Navigate to={`/admin/login?next=${encodedNext}`} replace />;
};

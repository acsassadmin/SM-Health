import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { CircularProgress, Box } from '@mui/material';
import { useRole } from '../context/RoleContext';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useRole();
  const location = useLocation();

  // 1. SPECIAL CHECK: If we are on the Login page, bypass the "User Required" check
  // This prevents the infinite loop / stuck loader when entering the site.
  if (location.pathname === '/login') {
    if (loading) {
      // Show a quick loader only while checking session initially
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
          <CircularProgress />
        </Box>
      );
    }
    // Allow the login page to render
    return <>{children}</>;
  }

  // 2. STANDARD CHECK: For all other pages (Dashboard, Staff, etc.)
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress size={60} sx={{ color: '#1a5fba' }} />
      </Box>
    );
  }

  if (!user) {
    // If not logged in and trying to access a protected page, go to login
    return <Navigate to="/login" replace />;
  }

  // 3. Logged in and accessing a protected page
  return <>{children}</>;
};

export default ProtectedRoute;
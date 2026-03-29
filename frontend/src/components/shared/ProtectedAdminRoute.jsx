import React, { useContext } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { AuthContext } from '../../contexts/AuthContext';

const ProtectedAdminRoute = () => {
  const context = useContext(AuthContext);

  if (!context) {
    return <Navigate to="/login" replace />;
  }

  const { user, loading } = context;

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role?.toLowerCase() !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};

export default ProtectedAdminRoute;

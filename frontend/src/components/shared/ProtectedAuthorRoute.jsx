import React, { useContext } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { AuthContext } from '../../contexts/AuthContext';

const ProtectedAuthorRoute = () => {
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

  // Case-insensitive role check
  if (user.role?.toLowerCase() !== 'author') {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};

export default ProtectedAuthorRoute;

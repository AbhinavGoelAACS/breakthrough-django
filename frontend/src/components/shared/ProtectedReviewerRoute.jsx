import React, { useContext } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { AuthContext } from '../../contexts/AuthContext';

const ProtectedReviewerRoute = () => {
  const context = useContext(AuthContext);

  if (!context) {
    return <Navigate to="/login" replace />;
  }

  const { user, loading } = context;

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        fontSize: '1.2rem',
        color: '#666'
      }}>
        <div style={{
          animation: 'spin 1s linear infinite',
          width: '40px',
          height: '40px',
          border: '4px solid #f3f3f3',
          borderTop: '4px solid #0D4715',
          borderRadius: '50%'
        }}></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role?.toLowerCase() !== 'reviewer') {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};

export default ProtectedReviewerRoute;

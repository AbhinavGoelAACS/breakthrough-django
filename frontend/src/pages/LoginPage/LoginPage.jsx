import React, { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { LoginForm } from '../../components/auth/LoginForm';
import { AuthError } from '../../components/auth/AuthError';
import '../AuthPages.css';

export const LoginPage = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, error, clearError } = useAuth();

  // Redirect if already logged in - based on role
  useEffect(() => {
    if (isAuthenticated && user) {
      // Role-based redirect (case-insensitive)
      const role = user.role?.toLowerCase();
      switch (role) {
        case 'admin':
          navigate('/admin', { replace: true });
          break;
        case 'editor':
          navigate('/editor', { replace: true });
          break;
        case 'author':
          navigate('/author', { replace: true });
          break;
        case 'reviewer':
          navigate('/reviewer', { replace: true });
          break;
        default:
          navigate('/', { replace: true });
      }
    }
  }, [isAuthenticated, user, navigate]);

  const handleLoginSuccess = () => {
    // The redirect will be handled by the useEffect above
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-box">
          <div className="auth-header">
            <h1>Welcome Back</h1>
            <p>Sign in to your account to continue</p>
          </div>

          {error && <AuthError error={error.general} onClose={clearError} autoClose={true} timeout={5000} />}

          <LoginForm onSuccess={handleLoginSuccess} />

          <div className="auth-footer">
            <p>
              Don't have an account?{' '}
              <Link to="/signup" className="auth-link">
                Create one
              </Link>
            </p>
          </div>
        </div>

        <div className="auth-side-image">
          <div className="auth-side-content">
            <h2>Breakthrough Publishers India</h2>
            <p>Academic Publishing Excellence</p>
          </div>
        </div>
      </div>
    </div>
  );
};

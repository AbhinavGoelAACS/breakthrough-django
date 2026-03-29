import React, { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { SignupForm } from '../../components/auth/SignupForm';
import { AuthError } from '../../components/auth/AuthError';
import { REDIRECT_URLS } from '../../constants/authConstants';
import '../AuthPages.css';

export const SignupPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated, error, clearError } = useAuth();

  // Redirect if already logged in
  useEffect(() => {
    if (isAuthenticated) {
      navigate(REDIRECT_URLS.DASHBOARD, { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleSignupSuccess = () => {
    navigate(REDIRECT_URLS.DASHBOARD, { replace: true });
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-box auth-box-signup">
          <div className="auth-header">
            <h1>Create Account</h1>
            <p>Join us to collaborate on research</p>
          </div>

          {error && <AuthError error={error.general} onClose={clearError} autoClose={true} timeout={5000} />}

          <SignupForm onSuccess={handleSignupSuccess} />

          <div className="auth-footer">
            <p>
              Already have an account?{' '}
              <Link to={REDIRECT_URLS.LOGIN_PAGE} className="auth-link">
                Sign in
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

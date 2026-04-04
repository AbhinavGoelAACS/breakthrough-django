import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useToast } from '../../hooks/useToast';
import apiService from '../../api/apiService';
import '../AuthPages.css';
import '../../components/auth/AuthForms.css';

export const ForgotPasswordPage = () => {
  const { success, error: showError } = useToast();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      showError('Please enter your email address');
      return;
    }

    setLoading(true);
    try {
      await apiService.post('/api/v1/auth/forgot-password', { email: email.trim() }, { skipAuth: true });
      setSent(true);
      success('Reset link sent! Check your email.');
    } catch (err) {
      showError(err.response?.data?.detail || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-box">
          <div className="auth-header">
            <h1>{sent ? 'Check Your Email' : 'Forgot Password'}</h1>
            <p>
              {sent
                ? 'We\'ve sent a password reset link to your email address.'
                : 'Enter your email and we\'ll send you a reset link.'}
            </p>
          </div>

          {sent ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>📧</div>
              <p style={{ color: '#475569', lineHeight: 1.6, marginBottom: '24px' }}>
                If an account exists for <strong>{email}</strong>, you'll receive an email with
                instructions to reset your password.
              </p>
              <button
                className="auth-form-button"
                onClick={() => { setSent(false); setEmail(''); }}
                style={{ maxWidth: '300px', margin: '0 auto 16px' }}
              >
                Send Again
              </button>
            </div>
          ) : (
            <form className="auth-form" onSubmit={handleSubmit}>
              <div className="auth-form-group">
                <label htmlFor="email" className="auth-form-label">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  className="auth-form-input"
                  placeholder="Enter your registered email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  required
                  autoFocus
                />
              </div>

              <button
                type="submit"
                className="auth-form-button"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="spinner"></span>
                    Sending...
                  </>
                ) : (
                  'Send Reset Link'
                )}
              </button>
            </form>
          )}

          <div className="auth-footer">
            <p>
              Remember your password?{' '}
              <Link to="/login" className="auth-link">
                Back to Login
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

export default ForgotPasswordPage;

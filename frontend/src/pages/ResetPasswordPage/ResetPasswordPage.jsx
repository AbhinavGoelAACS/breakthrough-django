import React, { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useToast } from '../../hooks/useToast';
import apiService from '../../api/apiService';
import PasswordPolicyIndicator from '../../components/shared/PasswordPolicyIndicator';
import { validatePasswordPolicy } from '../../utils/passwordPolicy';
import '../AuthPages.css';
import '../../components/auth/AuthForms.css';

export const ResetPasswordPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { success, error: showError } = useToast();
  const [formData, setFormData] = useState({ new_password: '', confirm_password: '' });
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      showError('Invalid reset link. Please request a new one.');
    }
  }, [token]);

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validatePasswordPolicy(formData.new_password)) {
      showError('Password does not meet the requirements');
      return;
    }

    if (formData.new_password !== formData.confirm_password) {
      showError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await apiService.post('/api/v1/auth/reset-password', {
        token,
        new_password: formData.new_password,
        confirm_password: formData.confirm_password,
      }, { skipAuth: true });
      setDone(true);
      success('Password reset successfully!');
    } catch (err) {
      showError(err.response?.data?.detail || 'Failed to reset password. The link may have expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-box">
          <div className="auth-header">
            <h1>{done ? 'Password Reset!' : 'Reset Password'}</h1>
            <p>
              {done
                ? 'Your password has been updated successfully.'
                : 'Enter your new password below.'}
            </p>
          </div>

          {done ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
              <p style={{ color: '#475569', lineHeight: 1.6, marginBottom: '24px' }}>
                You can now log in with your new password.
              </p>
              <button
                className="auth-form-button"
                onClick={() => navigate('/login')}
                style={{ maxWidth: '300px', margin: '0 auto' }}
              >
                Go to Login
              </button>
            </div>
          ) : !token ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
              <p style={{ color: '#475569', lineHeight: 1.6, marginBottom: '24px' }}>
                This reset link is invalid or missing. Please request a new password reset.
              </p>
              <button
                className="auth-form-button"
                onClick={() => navigate('/forgot-password')}
                style={{ maxWidth: '300px', margin: '0 auto' }}
              >
                Request New Link
              </button>
            </div>
          ) : (
            <form className="auth-form" onSubmit={handleSubmit}>
              <div className="auth-form-group">
                <label htmlFor="new_password" className="auth-form-label">
                  New Password
                </label>
                <input
                  id="new_password"
                  type="password"
                  name="new_password"
                  className="auth-form-input"
                  placeholder="Enter new password"
                  value={formData.new_password}
                  onChange={handleChange}
                  disabled={loading}
                  minLength={8}
                  required
                  autoFocus
                />
                <PasswordPolicyIndicator password={formData.new_password} />
              </div>

              <div className="auth-form-group">
                <label htmlFor="confirm_password" className="auth-form-label">
                  Confirm Password
                </label>
                <input
                  id="confirm_password"
                  type="password"
                  name="confirm_password"
                  className="auth-form-input"
                  placeholder="Confirm new password"
                  value={formData.confirm_password}
                  onChange={handleChange}
                  disabled={loading}
                  minLength={8}
                  required
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
                    Resetting...
                  </>
                ) : (
                  'Reset Password'
                )}
              </button>
            </form>
          )}

          <div className="auth-footer">
            <p>
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

export default ResetPasswordPage;

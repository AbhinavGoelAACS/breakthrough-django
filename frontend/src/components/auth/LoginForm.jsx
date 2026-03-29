import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { AuthFieldError } from './AuthError';
import { validateLoginForm } from '../../utils/validation';
import { formatValidationErrors } from '../../utils/errorFormatter';
import './AuthForms.css';

export const LoginForm = ({ onSuccess = null }) => {
  const { login, loading, error, clearError } = useAuth();
  const { success, error: showError } = useToast();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [isValidating, setIsValidating] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Clear field error when user starts typing
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({
        ...prev,
        [name]: null,
      }));
    }
  };

  const handleBlur = (e) => {
    const { name } = e.target;
    // Optionally validate on blur
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsValidating(true);
    clearError();

    // Validate form
    const validation = validateLoginForm(formData);
    if (!validation.isValid) {
      setFieldErrors(validation.errors);
      setIsValidating(false);
      return;
    }

    setFieldErrors({});

    try {
      await login(formData.email, formData.password);
      // Success - redirect handled by parent component
      success('Login successful! Redirecting...');
      if (onSuccess) onSuccess();
    } catch (err) {
      // Error handled by context and displayed by parent
      console.error('Login error:', err);
      showError(err.response?.data?.detail || 'Login failed. Please check your credentials.');
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <div className="auth-form-group">
        <label htmlFor="email" className="auth-form-label">
          Email Address
        </label>
        <input
          id="email"
          type="email"
          name="email"
          className={`auth-form-input ${fieldErrors.email ? 'error' : ''}`}
          placeholder="Enter your email"
          value={formData.email}
          onChange={handleInputChange}
          onBlur={handleBlur}
          disabled={loading || isValidating}
          required
        />
        {fieldErrors.email && <AuthFieldError error={fieldErrors.email} />}
      </div>

      <div className="auth-form-group">
        <label htmlFor="password" className="auth-form-label">
          Password
        </label>
        <input
          id="password"
          type="password"
          name="password"
          className={`auth-form-input ${fieldErrors.password ? 'error' : ''}`}
          placeholder="Enter your password"
          value={formData.password}
          onChange={handleInputChange}
          onBlur={handleBlur}
          disabled={loading || isValidating}
          required
        />
        {fieldErrors.password && <AuthFieldError error={fieldErrors.password} />}
      </div>

      <button
        type="submit"
        className="auth-form-button"
        disabled={loading || isValidating}
      >
        {loading || isValidating ? (
          <>
            <span className="spinner"></span>
            Logging in...
          </>
        ) : (
          'Login'
        )}
      </button>
    </form>
  );
};

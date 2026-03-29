import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { AuthFieldError } from './AuthError';
import { validateSignupForm } from '../../utils/validation';
import OrganizationAutocomplete from '../OrganizationAutocomplete';
import './AuthForms.css';

export const SignupForm = ({ onSuccess = null }) => {
  const { signup, loading, error, clearError } = useAuth();
  const { success, error: showError } = useToast();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirm_password: '',
    fname: '',
    lname: '',
    mname: '',
    title: '',
    affiliation: '',
    specialization: '',
    contact: '',
    address: '',
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsValidating(true);
    clearError();

    // Validate form
    const validation = validateSignupForm(formData);
    if (!validation.isValid) {
      setFieldErrors(validation.errors);
      setIsValidating(false);
      return;
    }

    setFieldErrors({});

    try {
      await signup(formData);
      // Success - redirect handled by parent component
      success('Account created successfully! Redirecting...');
      if (onSuccess) onSuccess();
    } catch (err) {
      // Error handled by context and displayed by parent
      console.error('Signup error:', err);
      showError(err.response?.data?.detail || 'Failed to create account. Please try again.');
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      {/* Required fields */}
      <div className="auth-form-row">
        <div className="auth-form-group auth-form-col-2">
          <label htmlFor="fname" className="auth-form-label">
            First Name *
          </label>
          <input
            id="fname"
            type="text"
            name="fname"
            className={`auth-form-input ${fieldErrors.fname ? 'error' : ''}`}
            placeholder="First name"
            value={formData.fname}
            onChange={handleInputChange}
            disabled={loading || isValidating}
            required
          />
          {fieldErrors.fname && <AuthFieldError error={fieldErrors.fname} />}
        </div>

        <div className="auth-form-group auth-form-col-2">
          <label htmlFor="lname" className="auth-form-label">
            Last Name *
          </label>
          <input
            id="lname"
            type="text"
            name="lname"
            className={`auth-form-input ${fieldErrors.lname ? 'error' : ''}`}
            placeholder="Last name"
            value={formData.lname}
            onChange={handleInputChange}
            disabled={loading || isValidating}
            required
          />
          {fieldErrors.lname && <AuthFieldError error={fieldErrors.lname} />}
        </div>
      </div>

      <div className="auth-form-group">
        <label htmlFor="email" className="auth-form-label">
          Email Address *
        </label>
        <input
          id="email"
          type="email"
          name="email"
          className={`auth-form-input ${fieldErrors.email ? 'error' : ''}`}
          placeholder="Enter your email"
          value={formData.email}
          onChange={handleInputChange}
          disabled={loading || isValidating}
          required
        />
        {fieldErrors.email && <AuthFieldError error={fieldErrors.email} />}
      </div>

      <div className="auth-form-group">
        <label htmlFor="password" className="auth-form-label">
          Password *
        </label>
        <input
          id="password"
          type="password"
          name="password"
          className={`auth-form-input ${fieldErrors.password ? 'error' : ''}`}
          placeholder="Min 8 chars: uppercase, lowercase, number, special char"
          value={formData.password}
          onChange={handleInputChange}
          disabled={loading || isValidating}
          required
        />
        {fieldErrors.password && <AuthFieldError error={fieldErrors.password} />}
      </div>

      <div className="auth-form-group">
        <label htmlFor="confirm_password" className="auth-form-label">
          Confirm Password *
        </label>
        <input
          id="confirm_password"
          type="password"
          name="confirm_password"
          className={`auth-form-input ${fieldErrors.confirm_password ? 'error' : ''}`}
          placeholder="Confirm your password"
          value={formData.confirm_password}
          onChange={handleInputChange}
          disabled={loading || isValidating}
          required
        />
        {fieldErrors.confirm_password && (
          <AuthFieldError error={fieldErrors.confirm_password} />
        )}
      </div>

      {/* Optional fields */}
      <div className="auth-form-row">
        <div className="auth-form-group auth-form-col-2">
          <label htmlFor="mname" className="auth-form-label">
            Middle Name
          </label>
          <input
            id="mname"
            type="text"
            name="mname"
            className={`auth-form-input ${fieldErrors.mname ? 'error' : ''}`}
            placeholder="Middle name (optional)"
            value={formData.mname}
            onChange={handleInputChange}
            disabled={loading || isValidating}
          />
          {fieldErrors.mname && <AuthFieldError error={fieldErrors.mname} />}
        </div>

        <div className="auth-form-group auth-form-col-2">
          <label htmlFor="title" className="auth-form-label">
            Title
          </label>
          <input
            id="title"
            type="text"
            name="title"
            className="auth-form-input"
            placeholder="Dr., Prof., etc. (optional)"
            value={formData.title}
            onChange={handleInputChange}
            disabled={loading || isValidating}
          />
        </div>
      </div>

      <div className="auth-form-group">
        <label htmlFor="affiliation" className="auth-form-label">
          Affiliation / Organization
        </label>
        <OrganizationAutocomplete
          id="affiliation"
          name="affiliation"
          placeholder="Search for your organization (optional)"
          value={formData.affiliation}
          onChange={(value) => {
            setFormData((prev) => ({ ...prev, affiliation: value }));
            if (fieldErrors.affiliation) {
              setFieldErrors((prev) => ({ ...prev, affiliation: null }));
            }
          }}
          disabled={loading || isValidating}
          className={fieldErrors.affiliation ? 'error' : ''}
        />
        {fieldErrors.affiliation && (
          <AuthFieldError error={fieldErrors.affiliation} />
        )}
      </div>

      <div className="auth-form-group">
        <label htmlFor="specialization" className="auth-form-label">
          Specialization / Research Area
        </label>
        <textarea
          id="specialization"
          name="specialization"
          className="auth-form-input"
          placeholder="Your research area or specialization (optional)"
          value={formData.specialization}
          onChange={handleInputChange}
          disabled={loading || isValidating}
          rows="2"
        />
      </div>

      <div className="auth-form-row">
        <div className="auth-form-group auth-form-col-2">
          <label htmlFor="contact" className="auth-form-label">
            Contact Number
          </label>
          <input
            id="contact"
            type="tel"
            name="contact"
            className="auth-form-input"
            placeholder="+1 (555) 123-4567 (optional)"
            value={formData.contact}
            onChange={handleInputChange}
            disabled={loading || isValidating}
          />
        </div>

        <div className="auth-form-group auth-form-col-2">
          <label htmlFor="address" className="auth-form-label">
            Address
          </label>
          <input
            id="address"
            type="text"
            name="address"
            className="auth-form-input"
            placeholder="City, Country (optional)"
            value={formData.address}
            onChange={handleInputChange}
            disabled={loading || isValidating}
          />
        </div>
      </div>

      <button
        type="submit"
        className="auth-form-button"
        disabled={loading || isValidating}
      >
        {loading || isValidating ? (
          <>
            <span className="spinner"></span>
            Creating Account...
          </>
        ) : (
          'Create Account'
        )}
      </button>

      <p className="auth-form-required-note">* Required fields</p>
    </form>
  );
};

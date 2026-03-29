import React from 'react';

/**
 * Reusable Button Component
 * Supports primary, secondary, success, and danger variants
 */

const BUTTON_VARIANTS = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  success: 'btn-success',
  danger: 'btn-danger',
};

export const Button = ({
  children,
  onClick,
  variant = 'primary',
  disabled = false,
  loading = false,
  type = 'button',
  className = '',
}) => {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`btn ${BUTTON_VARIANTS[variant] || ''} ${className}`}
    >
      {loading ? 'Loading...' : children}
    </button>
  );
};

export default Button;

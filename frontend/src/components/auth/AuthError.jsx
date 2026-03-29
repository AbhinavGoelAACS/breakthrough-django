import React, { useEffect, useState } from 'react';
import './AuthError.css';

export const AuthError = ({ error, onClose = null, autoClose = true, timeout = 5000 }) => {
  const [isVisible, setIsVisible] = useState(!!error);

  useEffect(() => {
    setIsVisible(!!error);

    if (error && autoClose) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        if (onClose) onClose();
      }, timeout);

      return () => clearTimeout(timer);
    }
  }, [error, autoClose, timeout, onClose]);

  if (!isVisible || !error) return null;

  return (
    <div className="auth-error">
      <div className="auth-error-content">
        <svg className="auth-error-icon" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
            clipRule="evenodd"
          />
        </svg>
        <div className="auth-error-text">
          <p className="auth-error-message">{error}</p>
        </div>
        <button
          className="auth-error-close"
          onClick={() => {
            setIsVisible(false);
            if (onClose) onClose();
          }}
          aria-label="Close error"
        >
          ✕
        </button>
      </div>
    </div>
  );
};

export const AuthFieldError = ({ error }) => {
  if (!error) return null;

  return <div className="auth-field-error">{error}</div>;
};

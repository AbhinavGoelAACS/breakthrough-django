import React from 'react';

/**
 * Reusable Alert Component
 * Displays error, success, warning, and info messages
 */

const ALERT_TYPES = {
  error: 'alert-error',
  success: 'alert-success',
  warning: 'alert-warning',
  info: 'alert-info',
};

export const Alert = ({ type = 'error', message, onDismiss }) => {
  if (!message) return null;

  return (
    <div className={`alert ${ALERT_TYPES[type] || ALERT_TYPES.error}`}>
      <span>{message}</span>
      {onDismiss && (
        <button type="button" onClick={onDismiss} className="alert-dismiss">
          ✕
        </button>
      )}
    </div>
  );
};

export default Alert;

import React, { useEffect } from 'react';
import './Toast.css';

const Toast = ({ id, type, message, duration = 4000, onClose }) => {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onClose(id);
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, id, onClose]);

  // Inline styles as backup
  const toastStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 20px',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    fontFamily: "'Open Sans', sans-serif",
    fontSize: '14px',
    minHeight: '56px',
    backgroundColor: type === 'error' ? '#f8d7da' : type === 'success' ? '#f0fdf4' : type === 'warning' ? '#fff3cd' : '#f0fdf4',
    color: type === 'error' ? '#721c24' : type === 'success' ? '#0D4715' : type === 'warning' ? '#856404' : '#0D4715',
    borderLeft: `4px solid ${type === 'error' ? '#dc3545' : type === 'success' ? '#0D4715' : type === 'warning' ? '#ffc107' : '#41644A'}`,
  };

  return (
    <div className={`toast toast-${type}`} style={toastStyle}>
      <div className="toast-content" style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, marginRight: '10px' }}>
        <span className="toast-icon" style={{ fontSize: '18px', fontWeight: 700, flexShrink: 0 }}>
          {type === 'success' && '✓'}
          {type === 'error' && '✕'}
          {type === 'warning' && '⚠'}
          {type === 'info' && 'ℹ'}
        </span>
        <span className="toast-message" style={{ lineHeight: 1.4 }}>{message}</span>
      </div>
      <button 
        className="toast-close" 
        onClick={() => onClose(id)}
        style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', padding: 0, color: 'inherit', opacity: 0.7 }}
      >
        ×
      </button>
    </div>
  );
};

export default Toast;

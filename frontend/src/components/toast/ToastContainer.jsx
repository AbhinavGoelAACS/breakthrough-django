import React from 'react';
import Toast from './Toast';
import './Toast.css';

const ToastContainer = ({ toasts, onRemoveToast }) => {
  const containerStyle = {
    position: 'fixed',
    top: '20px',
    right: '20px',
    zIndex: 10001,
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    maxWidth: '400px',
  };

  return (
    <div className="toast-container" style={containerStyle}>
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          id={toast.id}
          type={toast.type}
          message={toast.message}
          duration={toast.duration}
          onClose={onRemoveToast}
        />
      ))}
    </div>
  );
};

export default ToastContainer;

import { useContext } from 'react';
import { ToastContext } from '../contexts/ToastContext';

export const useToast = () => {
  const context = useContext(ToastContext);
  
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }

  return {
    success: (message, duration) => context.addToast(message, 'success', duration),
    error: (message, duration) => context.addToast(message, 'error', duration),
    warning: (message, duration) => context.addToast(message, 'warning', duration),
    info: (message, duration) => context.addToast(message, 'info', duration),
  };
};

export default useToast;

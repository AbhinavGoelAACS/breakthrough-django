import React, { createContext, useState, useCallback, useEffect } from 'react';
import { setToastHandler } from '../utils/toast';

// Default context value to prevent undefined errors
const defaultContextValue = {
  toasts: [],
  addToast: () => {},
  removeToast: () => {},
};

export const ToastContext = createContext(defaultContextValue);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info', duration = 4000) => {
    const id = Date.now();
    setToasts((prevToasts) => [...prevToasts, { id, message, type, duration }]);
    return id;
  }, []);

  // Register global toast handler for use outside React
  useEffect(() => {
    setToastHandler(addToast);
  }, [addToast]);

  const removeToast = useCallback((id) => {
    setToasts((prevToasts) => prevToasts.filter((toast) => toast.id !== id));
  }, []);

  const value = {
    toasts,
    addToast,
    removeToast,
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
    </ToastContext.Provider>
  );
};

export default ToastProvider;
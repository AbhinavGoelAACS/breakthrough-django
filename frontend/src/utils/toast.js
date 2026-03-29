// Standalone toast utility for use outside React components
let toastHandler = null;

export const setToastHandler = (handler) => {
  toastHandler = handler;
};

export const showToast = (message, type = 'info', duration = 4000) => {
  if (toastHandler) {
    toastHandler(message, type, duration);
  } else {
    console.warn('Toast handler not initialized');
  }
};

export const toast = {
  success: (message, duration) => showToast(message, 'success', duration),
  error: (message, duration) => showToast(message, 'error', duration),
  warning: (message, duration) => showToast(message, 'warning', duration),
  info: (message, duration) => showToast(message, 'info', duration),
};

export default toast;

import React, { createContext, useState, useCallback } from 'react';

// Default context value to prevent undefined errors
const defaultContextValue = {
  isOpen: false,
  title: '',
  message: '',
  confirmText: 'OK',
  cancelText: 'Cancel',
  type: 'info',
  onConfirm: null,
  onCancel: null,
  openModal: () => {},
  closeModal: () => {},
};

export const ModalContext = createContext(defaultContextValue);

export const ModalProvider = ({ children }) => {
  const [modalState, setModalState] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'OK',
    cancelText: 'Cancel',
    type: 'info',
    onConfirm: null,
    onCancel: null,
  });

  const openModal = useCallback((config) => {
    setModalState({
      isOpen: true,
      title: config.title || 'Confirm',
      message: config.message || '',
      confirmText: config.confirmText || 'OK',
      cancelText: config.cancelText || 'Cancel',
      type: config.type || 'info',
      onConfirm: config.onConfirm,
      onCancel: config.onCancel,
    });
  }, []);

  const closeModal = useCallback(() => {
    setModalState((prev) => ({ ...prev, isOpen: false }));
  }, []);

  const value = {
    ...modalState,
    openModal,
    closeModal,
  };

  return (
    <ModalContext.Provider value={value}>
      {children}
    </ModalContext.Provider>
  );
};

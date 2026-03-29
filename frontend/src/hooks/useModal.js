import { useContext } from 'react';
import { ModalContext } from '../contexts/ModalContext';

export const useModal = () => {
  const context = useContext(ModalContext);
  
  if (!context) {
    throw new Error('useModal must be used within a ModalProvider');
  }

  return {
    openModal: context.openModal,
    closeModal: context.closeModal,
    confirm: (config) => {
      return new Promise((resolve) => {
        context.openModal({
          ...config,
          type: config.type || 'warning',
          onConfirm: () => {
            context.closeModal();
            if (config.onConfirm) config.onConfirm();
            resolve(true);
          },
          onCancel: () => {
            context.closeModal();
            if (config.onCancel) config.onCancel();
            resolve(false);
          },
        });
      });
    },
  };
};

export default useModal;

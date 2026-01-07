/**
 * ModalContext - Global modal management for errors, confirmations, and alerts
 * Usage: const { showError, showSuccess, showConfirm } = useModal();
 */

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { GlassModal, ModalType, ModalButton } from '@bayit/shared/ui';
import { useTranslation } from 'react-i18next';

interface ModalState {
  visible: boolean;
  type: ModalType;
  title?: string;
  message: string;
  buttons: ModalButton[];
  loading: boolean;
  dismissable: boolean;
}

interface ModalContextValue {
  showError: (message: string, title?: string) => void;
  showSuccess: (message: string, title?: string) => void;
  showWarning: (message: string, title?: string) => void;
  showInfo: (message: string, title?: string) => void;
  showConfirm: (
    message: string,
    onConfirm: () => void | Promise<void>,
    options?: {
      title?: string;
      confirmText?: string;
      cancelText?: string;
      destructive?: boolean;
    }
  ) => void;
  showLoading: (message: string) => void;
  hideModal: () => void;
}

const defaultState: ModalState = {
  visible: false,
  type: 'info',
  message: '',
  buttons: [],
  loading: false,
  dismissable: true,
};

const ModalContext = createContext<ModalContextValue | null>(null);

export const ModalProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { t } = useTranslation();
  const [modalState, setModalState] = useState<ModalState>(defaultState);

  const hideModal = useCallback(() => {
    setModalState(prev => ({ ...prev, visible: false }));
  }, []);

  const showError = useCallback((message: string, title?: string) => {
    setModalState({
      visible: true,
      type: 'error',
      title: title || t('common.error', 'Error'),
      message,
      buttons: [{ text: t('common.ok', 'OK'), style: 'default' }],
      loading: false,
      dismissable: true,
    });
  }, [t]);

  const showSuccess = useCallback((message: string, title?: string) => {
    setModalState({
      visible: true,
      type: 'success',
      title: title || t('common.success', 'Success'),
      message,
      buttons: [{ text: t('common.ok', 'OK'), style: 'default' }],
      loading: false,
      dismissable: true,
    });
  }, [t]);

  const showWarning = useCallback((message: string, title?: string) => {
    setModalState({
      visible: true,
      type: 'warning',
      title: title || t('common.warning', 'Warning'),
      message,
      buttons: [{ text: t('common.ok', 'OK'), style: 'default' }],
      loading: false,
      dismissable: true,
    });
  }, [t]);

  const showInfo = useCallback((message: string, title?: string) => {
    setModalState({
      visible: true,
      type: 'info',
      title,
      message,
      buttons: [{ text: t('common.ok', 'OK'), style: 'default' }],
      loading: false,
      dismissable: true,
    });
  }, [t]);

  const showConfirm = useCallback((
    message: string,
    onConfirm: () => void | Promise<void>,
    options?: {
      title?: string;
      confirmText?: string;
      cancelText?: string;
      destructive?: boolean;
    }
  ) => {
    setModalState({
      visible: true,
      type: 'confirm',
      title: options?.title || t('common.confirm', 'Confirm'),
      message,
      buttons: [
        {
          text: options?.cancelText || t('common.cancel', 'Cancel'),
          style: 'cancel',
        },
        {
          text: options?.confirmText || t('common.confirm', 'Confirm'),
          style: options?.destructive ? 'destructive' : 'default',
          onPress: async () => {
            try {
              await onConfirm();
            } catch (err) {
              const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
              showError(errorMessage);
            }
          },
        },
      ],
      loading: false,
      dismissable: true,
    });
  }, [t, showError]);

  const showLoading = useCallback((message: string) => {
    setModalState({
      visible: true,
      type: 'info',
      message,
      buttons: [],
      loading: true,
      dismissable: false,
    });
  }, []);

  return (
    <ModalContext.Provider
      value={{
        showError,
        showSuccess,
        showWarning,
        showInfo,
        showConfirm,
        showLoading,
        hideModal,
      }}
    >
      {children}
      <GlassModal
        visible={modalState.visible}
        type={modalState.type}
        title={modalState.title}
        message={modalState.message}
        buttons={modalState.buttons}
        onClose={hideModal}
        loading={modalState.loading}
        dismissable={modalState.dismissable}
      />
    </ModalContext.Provider>
  );
};

export const useModal = (): ModalContextValue => {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModal must be used within a ModalProvider');
  }
  return context;
};

export default ModalContext;

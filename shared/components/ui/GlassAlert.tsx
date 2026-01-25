/**
 * GlassAlert - Drop-in replacement for React Native Alert.alert
 * Provides a glassmorphic alert dialog that works across all platforms
 */

import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { GlassModal, type ModalButton, type ModalType } from './GlassModal';
import { logger } from '../../utils/logger';

// Scoped logger for glass alert component
const glassAlertLogger = logger.scope('UI:GlassAlert');

// Types for Alert.alert compatibility
export interface AlertButton {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

export interface AlertOptions {
  cancelable?: boolean;
  onDismiss?: () => void;
  type?: ModalType;
}

interface AlertState {
  visible: boolean;
  title: string;
  message?: string;
  buttons: AlertButton[];
  options?: AlertOptions;
}

interface AlertContextType {
  alert: (
    title: string,
    message?: string,
    buttons?: AlertButton[],
    options?: AlertOptions
  ) => void;
  confirm: (
    title: string,
    message?: string,
    onConfirm?: () => void,
    onCancel?: () => void
  ) => void;
  error: (title: string, message?: string, onDismiss?: () => void) => void;
  success: (title: string, message?: string, onDismiss?: () => void) => void;
  warning: (title: string, message?: string, onDismiss?: () => void) => void;
  info: (title: string, message?: string, onDismiss?: () => void) => void;
}

const AlertContext = createContext<AlertContextType | null>(null);

/**
 * Provider component that enables GlassAlert throughout the app.
 * Wrap your app root with this provider.
 */
export const GlassAlertProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [alertState, setAlertState] = useState<AlertState>({
    visible: false,
    title: '',
    message: undefined,
    buttons: [],
    options: undefined,
  });

  const closeAlert = useCallback(() => {
    setAlertState((prev) => ({ ...prev, visible: false }));
    alertState.options?.onDismiss?.();
  }, [alertState.options]);

  const alert = useCallback(
    (
      title: string,
      message?: string,
      buttons?: AlertButton[],
      options?: AlertOptions
    ) => {
      setAlertState({
        visible: true,
        title,
        message,
        buttons: buttons || [{ text: 'OK', style: 'default' }],
        options,
      });
    },
    []
  );

  const confirm = useCallback(
    (
      title: string,
      message?: string,
      onConfirm?: () => void,
      onCancel?: () => void
    ) => {
      setAlertState({
        visible: true,
        title,
        message,
        buttons: [
          { text: 'Cancel', style: 'cancel', onPress: onCancel },
          { text: 'Confirm', style: 'default', onPress: onConfirm },
        ],
        options: { type: 'confirm' },
      });
    },
    []
  );

  const error = useCallback(
    (title: string, message?: string, onDismiss?: () => void) => {
      setAlertState({
        visible: true,
        title,
        message,
        buttons: [{ text: 'OK', style: 'default', onPress: onDismiss }],
        options: { type: 'error', onDismiss },
      });
    },
    []
  );

  const success = useCallback(
    (title: string, message?: string, onDismiss?: () => void) => {
      setAlertState({
        visible: true,
        title,
        message,
        buttons: [{ text: 'OK', style: 'default', onPress: onDismiss }],
        options: { type: 'success', onDismiss },
      });
    },
    []
  );

  const warning = useCallback(
    (title: string, message?: string, onDismiss?: () => void) => {
      setAlertState({
        visible: true,
        title,
        message,
        buttons: [{ text: 'OK', style: 'default', onPress: onDismiss }],
        options: { type: 'warning', onDismiss },
      });
    },
    []
  );

  const info = useCallback(
    (title: string, message?: string, onDismiss?: () => void) => {
      setAlertState({
        visible: true,
        title,
        message,
        buttons: [{ text: 'OK', style: 'default', onPress: onDismiss }],
        options: { type: 'info', onDismiss },
      });
    },
    []
  );

  // Convert AlertButton[] to ModalButton[]
  const modalButtons: ModalButton[] = alertState.buttons.map((btn) => ({
    text: btn.text,
    onPress: btn.onPress,
    style: btn.style,
  }));

  return (
    <AlertContext.Provider
      value={{ alert, confirm, error, success, warning, info }}
    >
      {children}
      <GlassModal
        visible={alertState.visible}
        type={alertState.options?.type || 'info'}
        title={alertState.title}
        message={alertState.message}
        buttons={modalButtons}
        onClose={closeAlert}
        dismissable={alertState.options?.cancelable !== false}
      />
    </AlertContext.Provider>
  );
};

/**
 * Hook to use GlassAlert in components.
 * Must be used within a GlassAlertProvider.
 *
 * @example
 * ```tsx
 * const { alert, confirm, error, success } = useGlassAlert();
 *
 * // Simple alert
 * alert('Title', 'Message');
 *
 * // Confirmation
 * confirm('Delete?', 'This cannot be undone', () => deleteItem());
 *
 * // Error alert
 * error('Error', 'Something went wrong');
 *
 * // Success alert
 * success('Success', 'Item saved');
 * ```
 */
export const useGlassAlert = (): AlertContextType => {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useGlassAlert must be used within a GlassAlertProvider');
  }
  return context;
};

/**
 * Static GlassAlert object for imperative usage.
 * Can be used as a drop-in replacement for Alert.alert.
 *
 * Note: This uses a module-level state and must be initialized
 * by placing GlassAlertRoot at your app root.
 *
 * @example
 * ```tsx
 * // Drop-in replacement for Alert.alert
 * GlassAlert.alert('Title', 'Message', [
 *   { text: 'Cancel', style: 'cancel' },
 *   { text: 'OK', onPress: () => logger.info('OK pressed') },
 * ]);
 * ```
 */
let globalAlertHandler: AlertContextType | null = null;

export const GlassAlert = {
  /**
   * Show an alert dialog.
   * Drop-in replacement for Alert.alert.
   */
  alert: (
    title: string,
    message?: string,
    buttons?: AlertButton[],
    options?: AlertOptions
  ) => {
    if (!globalAlertHandler) {
      glassAlertLogger.warn('GlassAlert not initialized - fallback logging', {
        title,
        message,
        buttonCount: buttons?.length || 0,
      });
      glassAlertLogger.error('Alert fallback', {
        title,
        message,
      });
      return;
    }
    globalAlertHandler.alert(title, message, buttons, options);
  },

  /**
   * Show a confirmation dialog with Cancel/Confirm buttons.
   */
  confirm: (
    title: string,
    message?: string,
    onConfirm?: () => void,
    onCancel?: () => void
  ) => {
    if (!globalAlertHandler) {
      glassAlertLogger.warn('GlassAlert not initialized - confirm fallback', {
        title,
        message,
      });
      return;
    }
    globalAlertHandler.confirm(title, message, onConfirm, onCancel);
  },

  /**
   * Show an error alert.
   */
  error: (title: string, message?: string, onDismiss?: () => void) => {
    if (!globalAlertHandler) {
      glassAlertLogger.error('Error alert fallback', {
        title,
        message,
      });
      return;
    }
    globalAlertHandler.error(title, message, onDismiss);
  },

  /**
   * Show a success alert.
   */
  success: (title: string, message?: string, onDismiss?: () => void) => {
    if (!globalAlertHandler) {
      glassAlertLogger.info('Success alert fallback', {
        title,
        message,
      });
      return;
    }
    globalAlertHandler.success(title, message, onDismiss);
  },

  /**
   * Show a warning alert.
   */
  warning: (title: string, message?: string, onDismiss?: () => void) => {
    if (!globalAlertHandler) {
      glassAlertLogger.warn('Warning alert fallback', {
        title,
        message,
      });
      return;
    }
    globalAlertHandler.warning(title, message, onDismiss);
  },

  /**
   * Show an info alert.
   */
  info: (title: string, message?: string, onDismiss?: () => void) => {
    if (!globalAlertHandler) {
      glassAlertLogger.info('Info alert fallback', {
        title,
        message,
      });
      return;
    }
    globalAlertHandler.info(title, message, onDismiss);
  },
};

/**
 * Root component that initializes the global GlassAlert handler.
 * Place this at your app root, alongside other providers.
 */
export const GlassAlertRoot: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  return (
    <GlassAlertProvider>
      <GlassAlertInitializer />
      {children}
    </GlassAlertProvider>
  );
};

/**
 * Internal component that registers the global handler.
 */
const GlassAlertInitializer: React.FC = () => {
  const alertContext = useContext(AlertContext);

  // Register the global handler
  React.useEffect(() => {
    globalAlertHandler = alertContext;
    return () => {
      globalAlertHandler = null;
    };
  }, [alertContext]);

  return null;
};

export default GlassAlert;

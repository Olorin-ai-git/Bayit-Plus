/**
 * GlassModal Compatibility Layer
 *
 * Backward-compatible wrapper for existing GlassModal usage.
 * Redirects to GlassToast notification system.
 *
 * DEPRECATED: Use useNotifications() instead.
 * This file will be removed after full migration.
 */

import React, { useEffect } from 'react';
import { useNotifications } from '../hooks/useNotifications';
import type { NotificationLevel } from '../native/components/GlassToast/types';

type ModalType = Exclude<NotificationLevel, 'debug'> | 'confirm';

export interface GlassModalCompatProps {
  visible: boolean;
  type?: ModalType;
  title?: string;
  message?: string;
  onClose?: () => void;
  dismissable?: boolean;
}

/**
 * @deprecated Use useNotifications() hook instead
 */
export const GlassModalCompat: React.FC<GlassModalCompatProps> = ({
  visible,
  type = 'info',
  title,
  message,
  onClose,
  dismissable = true,
}) => {
  const notifications = useNotifications();

  useEffect(() => {
    if (visible && message) {
      // Map ModalType to NotificationLevel
      const levelMap: Record<ModalType, NotificationLevel> = {
        error: 'error',
        success: 'success',
        warning: 'warning',
        info: 'info',
        confirm: 'info',
      };

      const level = levelMap[type];

      notifications.show({
        level,
        message,
        title,
        dismissable,
        duration: type === 'error' ? 5000 : 3000,
      });

      // Auto-call onClose after notification
      if (onClose) {
        setTimeout(onClose, type === 'error' ? 5000 : 3000);
      }
    }
  }, [visible, type, title, message, dismissable]);

  // Render nothing - notifications handled by GlassToast
  return null;
};

export default GlassModalCompat;

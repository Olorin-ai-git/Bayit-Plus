/**
 * Toast Container Component
 *
 * Displays toast notifications with glass styling.
 */

import React from 'react';
import { useUIStore } from '../../stores/uiStore';
import type { ToastType } from '../../stores/uiStore';

const toastIcons: Record<ToastType, string> = {
  success: '✓',
  error: '✕',
  warning: '⚠',
  info: 'ℹ',
};

const toastColors: Record<ToastType, string> = {
  success: 'border-green-500/50 bg-green-500/10',
  error: 'border-red-500/50 bg-red-500/10',
  warning: 'border-yellow-500/50 bg-yellow-500/10',
  info: 'border-blue-500/50 bg-blue-500/10',
};

const iconColors: Record<ToastType, string> = {
  success: 'text-green-400 bg-green-500/20',
  error: 'text-red-400 bg-red-500/20',
  warning: 'text-yellow-400 bg-yellow-500/20',
  info: 'text-blue-400 bg-blue-500/20',
};

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useUIStore();

  if (toasts.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 rtl:left-4 rtl:right-auto">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`
            flex items-center gap-3 px-4 py-3
            min-w-[300px] max-w-[400px]
            rounded-xl border backdrop-blur-xl
            shadow-lg shadow-black/20
            animate-slide-in-right
            ${toastColors[toast.type]}
          `}
          role="alert"
        >
          <span
            className={`
              flex items-center justify-center
              w-6 h-6 rounded-full text-sm font-bold
              ${iconColors[toast.type]}
            `}
          >
            {toastIcons[toast.type]}
          </span>

          <span className="flex-1 text-sm text-white/90">{toast.message}</span>

          <button
            onClick={() => removeToast(toast.id)}
            className="
              flex items-center justify-center
              w-6 h-6 rounded-full
              text-white/50 hover:text-white/80
              hover:bg-white/10
              transition-colors
            "
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
};

export default ToastContainer;

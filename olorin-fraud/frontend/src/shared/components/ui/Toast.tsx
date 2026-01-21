import React, { useEffect, useState, useRef } from 'react';
import {
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

export interface ToastProps {
  id?: string;
  variant?: 'success' | 'error' | 'warning' | 'info';
  title?: string;
  message: string;
  autoHide?: boolean;
  duration?: number;
  onClose?: () => void;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export const Toast: React.FC<ToastProps> = ({
  id,
  variant = 'info',
  title,
  message,
  autoHide = true,
  duration = 5000,
  onClose,
  action
}) => {
  const [isPaused, setIsPaused] = useState(false);
  const [remainingTime, setRemainingTime] = useState(duration);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    if (!autoHide || !onClose) return;

    const startTimer = () => {
      startTimeRef.current = Date.now();
      timerRef.current = setTimeout(() => {
        onClose();
      }, remainingTime);
    };

    if (!isPaused) {
      startTimer();
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [isPaused, remainingTime, autoHide, onClose]);

  const handleMouseEnter = () => {
    if (autoHide && timerRef.current) {
      clearTimeout(timerRef.current);
      const elapsed = Date.now() - startTimeRef.current;
      setRemainingTime((prev) => prev - elapsed);
      setIsPaused(true);
    }
  };

  const handleMouseLeave = () => {
    if (autoHide) {
      setIsPaused(false);
    }
  };

  const variantConfig = {
    success: {
      icon: CheckCircleIcon,
      bgClass: 'bg-green-900/30',
      borderClass: 'border-green-500',
      textClass: 'text-green-200',
      iconClass: 'text-green-400',
      shadowClass: 'shadow-lg shadow-green-500/20'
    },
    error: {
      icon: XCircleIcon,
      bgClass: 'bg-red-900/30',
      borderClass: 'border-red-500',
      textClass: 'text-red-200',
      iconClass: 'text-red-400',
      shadowClass: 'shadow-lg shadow-red-500/20'
    },
    warning: {
      icon: ExclamationTriangleIcon,
      bgClass: 'bg-amber-900/30',
      borderClass: 'border-amber-500',
      textClass: 'text-amber-200',
      iconClass: 'text-amber-400',
      shadowClass: 'shadow-lg shadow-amber-500/20'
    },
    info: {
      icon: InformationCircleIcon,
      bgClass: 'bg-cyan-900/30',
      borderClass: 'border-cyan-500',
      textClass: 'text-cyan-200',
      iconClass: 'text-cyan-400',
      shadowClass: 'shadow-lg shadow-cyan-500/20'
    }
  };

  const config = variantConfig[variant];
  const Icon = config.icon;

  return (
    <div
      className={`
        relative flex items-start gap-3 p-4 rounded-lg border-2 backdrop-blur-md
        ${config.bgClass} ${config.borderClass} ${config.textClass} ${config.shadowClass}
        animate-in slide-in-from-right-5 fade-in duration-300
        min-w-[320px] max-w-md
      `}
      role="alert"
      aria-live="polite"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        backdropFilter: 'blur(12px)'
      }}
    >
      {/* Icon */}
      <Icon className={`w-6 h-6 flex-shrink-0 ${config.iconClass}`} />

      {/* Content */}
      <div className="flex-1 min-w-0">
        {title && (
          <div className="font-bold text-base mb-1.5 text-white">
            {title}
          </div>
        )}
        <div className="text-sm leading-relaxed opacity-90">{message}</div>

        {/* Action Button */}
        {action && (
          <button
            onClick={action.onClick}
            className="mt-3 text-sm font-medium hover:underline focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-corporate-bgPrimary focus:ring-corporate-accentPrimary rounded px-2 py-1"
          >
            {action.label}
          </button>
        )}
      </div>

      {/* Close Button */}
      {onClose && (
        <button
          onClick={onClose}
          className="flex-shrink-0 p-1 hover:bg-white/10 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-corporate-bgPrimary focus:ring-corporate-accentPrimary"
          aria-label="Close notification"
        >
          <XMarkIcon className="w-5 h-5" />
        </button>
      )}
    </div>
  );
};

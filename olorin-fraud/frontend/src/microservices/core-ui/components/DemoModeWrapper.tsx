import React from 'react';
import { useRoleAccess } from '../hooks/useRoleAccess';

interface DemoModeWrapperProps {
  children: React.ReactNode;
  /** Custom message for the demo banner */
  message?: string;
  /** Whether to disable interactions (default: true for viewers) */
  disableInteractions?: boolean;
  /** Whether to show the demo banner (default: true) */
  showBanner?: boolean;
}

/**
 * DemoModeWrapper component for viewer role restrictions.
 * Displays a demo banner and optionally disables interactions.
 */
export const DemoModeWrapper: React.FC<DemoModeWrapperProps> = ({
  children,
  message = 'Demo Mode: You are viewing in read-only mode',
  disableInteractions = true,
  showBanner = true,
}) => {
  const { isViewerMode } = useRoleAccess();

  // If not in viewer mode, render children normally
  if (!isViewerMode) {
    return <>{children}</>;
  }

  return (
    <div className="relative">
      {/* Demo Mode Banner */}
      {showBanner && (
        <div className="sticky top-0 z-50 bg-amber-500/20 border-b border-amber-500/50 px-4 py-2">
          <div className="flex items-center justify-center gap-2">
            <svg
              className="w-5 h-5 text-amber-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-amber-200 text-sm font-medium">{message}</p>
          </div>
        </div>
      )}

      {/* Content with optional interaction blocking */}
      {disableInteractions ? (
        <div className="relative">
          {/* Overlay to block interactions */}
          <div
            className="absolute inset-0 z-40 cursor-not-allowed"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              // Show notification
              const event = new CustomEvent('notification:show', {
                detail: {
                  type: 'info',
                  title: 'Demo Mode',
                  message: 'This action is not available in demo mode.',
                },
              });
              window.dispatchEvent(event);
            }}
          />
          {/* Content with reduced opacity */}
          <div className="opacity-80 pointer-events-none select-none">
            {children}
          </div>
        </div>
      ) : (
        children
      )}
    </div>
  );
};

/**
 * Hook to check if an action should be blocked in demo mode.
 * Returns a handler that either executes the action or shows a notification.
 */
export function useDemoModeAction<T extends (...args: any[]) => any>(
  action: T
): T {
  const { isViewerMode } = useRoleAccess();

  if (!isViewerMode) {
    return action;
  }

  return ((...args: any[]) => {
    const event = new CustomEvent('notification:show', {
      detail: {
        type: 'warning',
        title: 'Demo Mode',
        message: 'This action is not available in demo mode.',
      },
    });
    window.dispatchEvent(event);
  }) as T;
}

export default DemoModeWrapper;

/**
 * Shared Component Contracts
 * Feature: 022-olorin-webportal-dark
 *
 * TypeScript interfaces defining the contracts for shared components
 * imported from olorin-front/src/shared/components
 *
 * These contracts ensure type safety and consistent usage across
 * the marketing portal and React investigation app.
 */

import { ReactNode, MouseEvent, KeyboardEvent } from 'react';

// ============================================================================
// Modal Component Contract
// ============================================================================

/**
 * Modal Component Props
 * Source: olorin-front/src/shared/components/Modal.tsx
 *
 * Glassmorphic modal with focus trapping and keyboard navigation.
 * Provides consistent modal UX across all Olorin properties.
 */
export interface ModalProps {
  /** Controls modal visibility */
  isOpen: boolean;

  /** Callback when modal should close */
  onClose: () => void;

  /** Optional modal title displayed in header */
  title?: string;

  /** Modal size variant */
  size?: 'sm' | 'md' | 'lg' | 'xl';

  /** Modal content */
  children: ReactNode;

  /** Show X close button in header (default: true) */
  showCloseButton?: boolean;

  /** Allow closing by clicking backdrop (default: true) */
  closeOnBackdrop?: boolean;

  /** Additional CSS classes for styling */
  className?: string;
}

// ============================================================================
// CollapsiblePanel Component Contract
// ============================================================================

/**
 * CollapsiblePanel Component Props
 * Source: olorin-front/src/shared/components/CollapsiblePanel.tsx
 *
 * Expandable panel with smooth animations and glassmorphic styling.
 * Used for organizing content into collapsible sections.
 */
export interface CollapsiblePanelProps {
  /** Panel title displayed in header */
  title: string;

  /** Panel content (visible when expanded) */
  children: ReactNode;

  /** Initial expanded state (default: true) */
  defaultExpanded?: boolean;

  /** Optional badges displayed in header */
  badges?: ReactNode[];

  /** Optional action buttons in header */
  actionButtons?: ReactNode[];

  /** Additional CSS classes for styling */
  className?: string;
}

// ============================================================================
// Button Component Contracts
// ============================================================================

/**
 * Button Component Props
 * Source: olorin-front/src/shared/components/ui/Button.tsx
 *
 * Primary button component with variants and loading states.
 */
export interface ButtonProps {
  /** Button variant style */
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';

  /** Button size */
  size?: 'sm' | 'md' | 'lg';

  /** Button content */
  children: ReactNode;

  /** Click handler */
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void;

  /** Disabled state */
  disabled?: boolean;

  /** Loading state (shows spinner) */
  loading?: boolean;

  /** Additional CSS classes */
  className?: string;

  /** Button type attribute */
  type?: 'button' | 'submit' | 'reset';

  /** Icon to display before text */
  icon?: ReactNode;

  /** Icon to display after text */
  iconAfter?: ReactNode;

  /** Full width button */
  fullWidth?: boolean;
}

// ============================================================================
// Badge Component Contract
// ============================================================================

/**
 * Badge Component Props
 * Source: olorin-front/src/shared/components/ui/Badge.tsx
 *
 * Status badge with semantic color variants.
 */
export interface BadgeProps {
  /** Badge variant (determines color) */
  variant?: 'success' | 'warning' | 'error' | 'info' | 'default';

  /** Badge size */
  size?: 'sm' | 'md';

  /** Badge content */
  children: ReactNode;

  /** Additional CSS classes */
  className?: string;

  /** Optional icon */
  icon?: ReactNode;
}

// ============================================================================
// Card Component Contract
// ============================================================================

/**
 * Card Component Props
 * Source: olorin-front/src/shared/components/ui/Card.tsx
 *
 * Base card component with glassmorphic styling.
 */
export interface CardProps {
  /** Card content */
  children: ReactNode;

  /** Card variant style */
  variant?: 'default' | 'elevated' | 'interactive';

  /** Additional CSS classes */
  className?: string;

  /** Click handler (for interactive cards) */
  onClick?: (event: MouseEvent<HTMLDivElement>) => void;

  /** Optional header content */
  header?: ReactNode;

  /** Optional footer content */
  footer?: ReactNode;
}

// ============================================================================
// LoadingSpinner Component Contract
// ============================================================================

/**
 * LoadingSpinner Component Props
 * Source: olorin-front/src/shared/components/LoadingSpinner.tsx
 *
 * Loading indicator with corporate styling.
 */
export interface LoadingSpinnerProps {
  /** Spinner size */
  size?: 'sm' | 'md' | 'lg';

  /** Color variant */
  variant?: 'primary' | 'secondary' | 'white';

  /** Additional CSS classes */
  className?: string;

  /** Optional loading text */
  text?: string;
}

// ============================================================================
// ErrorBoundary Component Contract
// ============================================================================

/**
 * ErrorBoundary Component Props
 * Source: olorin-front/src/shared/components/ErrorBoundary.tsx
 *
 * Error boundary with fallback UI.
 */
export interface ErrorBoundaryProps {
  /** Child components to wrap */
  children: ReactNode;

  /** Custom fallback UI (optional) */
  fallback?: ReactNode | ((error: Error, errorInfo: React.ErrorInfo) => ReactNode);

  /** Error handler callback */
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;

  /** Reset error callback */
  onReset?: () => void;
}

// ============================================================================
// Form Component Contracts
// ============================================================================

/**
 * FormField Component Props
 * Source: olorin-front/src/shared/components/FormField.tsx
 *
 * Form field wrapper with label and error display.
 */
export interface FormFieldProps {
  /** Field label */
  label: string;

  /** Field name/id */
  name: string;

  /** Field content (input, select, textarea, etc.) */
  children: ReactNode;

  /** Error message (if validation failed) */
  error?: string;

  /** Help text */
  helpText?: string;

  /** Required field indicator */
  required?: boolean;

  /** Additional CSS classes */
  className?: string;
}

/**
 * Input Component Props
 * Source: olorin-front/src/shared/components/ui/Input.tsx
 *
 * Styled input field with corporate theme.
 */
export interface InputProps {
  /** Input type */
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'search';

  /** Input name */
  name: string;

  /** Input value */
  value: string;

  /** Change handler */
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;

  /** Placeholder text */
  placeholder?: string;

  /** Disabled state */
  disabled?: boolean;

  /** Error state */
  error?: boolean;

  /** Additional CSS classes */
  className?: string;

  /** Icon to display before input */
  icon?: ReactNode;

  /** Icon to display after input */
  iconAfter?: ReactNode;

  /** Keyboard event handler */
  onKeyDown?: (event: KeyboardEvent<HTMLInputElement>) => void;
}

/**
 * Textarea Component Props
 */
export interface TextareaProps {
  /** Textarea name */
  name: string;

  /** Textarea value */
  value: string;

  /** Change handler */
  onChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;

  /** Placeholder text */
  placeholder?: string;

  /** Number of rows */
  rows?: number;

  /** Disabled state */
  disabled?: boolean;

  /** Error state */
  error?: boolean;

  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// Notification Component Contract
// ============================================================================

/**
 * NotificationToast Component Props
 * Source: olorin-front/src/shared/components/NotificationToast.tsx
 *
 * Toast notification with auto-dismiss.
 */
export interface NotificationToastProps {
  /** Notification variant (determines color and icon) */
  variant: 'success' | 'error' | 'warning' | 'info';

  /** Notification title */
  title: string;

  /** Notification message */
  message?: string;

  /** Visibility state */
  isVisible: boolean;

  /** Close callback */
  onClose: () => void;

  /** Auto-dismiss duration in ms (0 = no auto-dismiss) */
  duration?: number;

  /** Show close button */
  showCloseButton?: boolean;

  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// ConfirmationModal Component Contract
// ============================================================================

/**
 * ConfirmationModal Component Props
 * Source: olorin-front/src/shared/components/ConfirmationModal.tsx
 *
 * Modal for user confirmations.
 */
export interface ConfirmationModalProps {
  /** Modal visibility */
  isOpen: boolean;

  /** Modal title */
  title: string;

  /** Confirmation message */
  message: string;

  /** Confirm button text (default: "Confirm") */
  confirmText?: string;

  /** Cancel button text (default: "Cancel") */
  cancelText?: string;

  /** Confirm button variant */
  confirmVariant?: 'primary' | 'danger';

  /** Confirm callback */
  onConfirm: () => void;

  /** Cancel callback */
  onCancel: () => void;

  /** Loading state (disables buttons) */
  isLoading?: boolean;
}

// ============================================================================
// Export All Contracts
// ============================================================================

export type {
  // Core UI
  ModalProps,
  CollapsiblePanelProps,
  ButtonProps,
  BadgeProps,
  CardProps,
  LoadingSpinnerProps,

  // Error Handling
  ErrorBoundaryProps,

  // Forms
  FormFieldProps,
  InputProps,
  TextareaProps,

  // Notifications
  NotificationToastProps,
  ConfirmationModalProps,
};

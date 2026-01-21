/**
 * Status Badge Color Configuration
 * Feature: 007-progress-wizard-page
 *
 * Olorin corporate palette colors for status indicators
 */

export const STATUS_COLORS = {
  pending: { bg: 'bg-corporate-borderPrimary/20', text: 'text-corporate-textSecondary', border: 'border-corporate-borderPrimary' },
  draft: { bg: 'bg-corporate-borderPrimary/20', text: 'text-corporate-textSecondary', border: 'border-corporate-borderPrimary' },
  running: { bg: 'bg-corporate-accentPrimary/20', text: 'text-corporate-accentPrimary', border: 'border-corporate-accentPrimary' },
  submitted: { bg: 'bg-corporate-accentSecondary/20', text: 'text-corporate-accentSecondary', border: 'border-corporate-accentSecondary' },
  paused: { bg: 'bg-corporate-warning/20', text: 'text-corporate-warning', border: 'border-corporate-warning' },
  completed: { bg: 'bg-corporate-success/20', text: 'text-corporate-success', border: 'border-corporate-success' },
  failed: { bg: 'bg-corporate-error/20', text: 'text-corporate-error', border: 'border-corporate-error' },
  cancelled: { bg: 'bg-corporate-borderPrimary/20', text: 'text-corporate-textSecondary', border: 'border-corporate-borderPrimary' }
} as const;

export const STATUS_LABELS = {
  pending: 'Pending',
  draft: 'Draft',
  running: 'Running',
  submitted: 'Submitted',
  paused: 'Paused',
  completed: 'Completed',
  failed: 'Failed',
  cancelled: 'Cancelled'
} as const;

/**
 * Status Mappers
 * Feature: 007-progress-wizard-page (T020)
 *
 * Maps Olorin statuses to Olorin status enums.
 */

/**
 * Maps backend investigation status to frontend status enum
 * Handles both uppercase (backend) and lowercase (legacy) status values
 *
 * Backend status values: CREATED, SETTINGS, IN_PROGRESS, COMPLETED, ERROR, CANCELLED
 * Frontend status values: pending, draft, running, submitted, paused, completed, failed, cancelled
 *
 * @param backendStatus - Investigation status from backend
 * @returns Frontend investigation status
 */
export function mapStatus(
  backendStatus: string
): 'pending' | 'draft' | 'running' | 'submitted' | 'paused' | 'completed' | 'failed' | 'cancelled' {
  // Normalize to lowercase for consistent mapping
  const normalizedStatus = backendStatus.toLowerCase();

  const mapping: Record<string, 'pending' | 'draft' | 'running' | 'submitted' | 'paused' | 'completed' | 'failed' | 'cancelled'> = {
    // Backend statuses (uppercase converted to lowercase)
    'created': 'draft',
    'settings': 'draft',
    'in_progress': 'running',
    'completed': 'completed',
    'error': 'failed',
    'cancelled': 'cancelled',

    // Legacy lowercase statuses (for backward compatibility)
    'pending': 'pending',
    'initializing': 'submitted',
    'running': 'running',
    'paused': 'paused',
    'failed': 'failed'
  };

  return mapping[normalizedStatus] || 'pending';
}

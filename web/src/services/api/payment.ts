/**
 * Payment API service
 *
 * Provides functions for interacting with payment endpoints:
 * - Get payment status (polling)
 * - Generate checkout URL (on-demand)
 */
import { useAuthStore } from '@/stores/authStore';
import logger from '@/utils/logger';

const paymentLogger = logger.scope('PaymentAPI');

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

export interface PaymentStatusResponse {
  payment_pending: boolean;
  subscription_tier: string | null;
  subscription_status: string | null;
  can_access_app: boolean;
  pending_plan_id: string | null;
}

export interface CheckoutSessionResponse {
  checkout_url: string;
  expires_in: number;
  session_id: string;
}

/**
 * Get current payment status for authenticated user
 *
 * Used for polling to check if payment has been completed.
 *
 * @returns Payment status object
 * @throws Error if request fails
 */
export async function getPaymentStatus(): Promise<PaymentStatusResponse> {
  const token = useAuthStore.getState().token;

  if (!token) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(`${API_BASE_URL}/auth/payment/status`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    paymentLogger.error('Failed to get payment status', {
      status: response.status,
      error,
    });
    throw new Error(error.detail || `HTTP ${response.status}`);
  }

  const data = await response.json();

  paymentLogger.debug('Payment status fetched', {
    payment_pending: data.payment_pending,
    can_access_app: data.can_access_app,
  });

  return data;
}

/**
 * Generate a fresh checkout URL for the given plan
 *
 * Checkout URLs are never stored - they're generated on-demand
 * when the user clicks "Continue to Payment".
 *
 * @param planId Plan ID (basic, premium, family)
 * @returns Checkout session with temporary URL
 * @throws Error if request fails
 */
export async function generateCheckoutUrl(
  planId: string = 'basic'
): Promise<CheckoutSessionResponse> {
  const token = useAuthStore.getState().token;

  if (!token) {
    throw new Error('Not authenticated');
  }

  paymentLogger.info('Generating checkout URL', { planId });

  const response = await fetch(
    `${API_BASE_URL}/auth/payment/checkout-url?plan_id=${encodeURIComponent(planId)}`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    paymentLogger.error('Failed to generate checkout URL', {
      status: response.status,
      error,
      planId,
    });
    throw new Error(error.detail || `HTTP ${response.status}`);
  }

  const data = await response.json();

  paymentLogger.info('Checkout URL generated', {
    session_id: data.session_id,
    expires_in: data.expires_in,
  });

  return data;
}

/**
 * Poll payment status with exponential backoff
 *
 * Helper function that wraps getPaymentStatus with retry logic.
 *
 * @param maxAttempts Maximum number of polling attempts (default: 60)
 * @param baseInterval Base interval in milliseconds (default: 5000)
 * @param onStatusUpdate Callback when status changes
 * @returns Cleanup function to stop polling
 */
export function pollPaymentStatus(
  maxAttempts: number = 60,
  baseInterval: number = 5000,
  onStatusUpdate?: (status: PaymentStatusResponse) => void
): () => void {
  let attempts = 0;
  let timeoutId: number | null = null;
  let cancelled = false;

  const poll = async () => {
    if (cancelled || attempts >= maxAttempts) {
      return;
    }

    try {
      const status = await getPaymentStatus();

      if (onStatusUpdate) {
        onStatusUpdate(status);
      }

      if (!status.payment_pending) {
        // Payment completed - stop polling
        paymentLogger.info('Payment completed, stopping poll');
        return;
      }

      // Continue polling with exponential backoff
      attempts++;
      const interval = attempts > 10 ? baseInterval * 2 : baseInterval;
      timeoutId = window.setTimeout(poll, interval);
    } catch (error) {
      paymentLogger.error('Payment status poll failed', error);

      // Retry with backoff
      attempts++;
      const retryInterval = baseInterval * Math.min(attempts, 3);
      timeoutId = window.setTimeout(poll, retryInterval);
    }
  };

  // Start polling
  poll();

  // Return cleanup function
  return () => {
    cancelled = true;
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }
  };
}

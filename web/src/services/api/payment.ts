/**
 * Payment API service
 *
 * Provides functions for interacting with payment endpoints:
 * - Get payment status (polling)
 * - Generate checkout URL (on-demand)
 */
import { api } from "@bayit/shared-services/api";
import logger from "@/utils/logger";

const paymentLogger = logger.scope("PaymentAPI");

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
  try {
    const data: PaymentStatusResponse = await api.get(
      "/auth/payment/status",
    );

    paymentLogger.debug("Payment status fetched", {
      payment_pending: data.payment_pending,
      can_access_app: data.can_access_app,
    });

    return data;
  } catch (error: any) {
    paymentLogger.error("Failed to get payment status", {
      status: error?.status,
      error,
    });
    throw new Error(error?.detail || "Failed to get payment status");
  }
}

/**
 * Generate a fresh checkout URL for the given plan
 *
 * Checkout URLs are never stored - they're generated on-demand
 * when the user clicks "Continue to Payment".
 *
 * @param planId Plan ID (free, plus)
 * @returns Checkout session with temporary URL
 * @throws Error if request fails
 */
export async function generateCheckoutUrl(
  planId: string = "plus",
): Promise<CheckoutSessionResponse> {
  paymentLogger.info("Generating checkout URL", { planId });

  try {
    const data: CheckoutSessionResponse = await api.get(
      "/auth/payment/checkout-url",
      { params: { plan_id: planId } },
    );

    paymentLogger.info("Checkout URL generated", {
      session_id: data.session_id,
      expires_in: data.expires_in,
    });

    return data;
  } catch (error: any) {
    paymentLogger.error("Failed to generate checkout URL", {
      status: error?.status,
      error,
      planId,
    });
    throw new Error(error?.detail || "Failed to generate checkout URL");
  }
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
  onStatusUpdate?: (status: PaymentStatusResponse) => void,
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
        paymentLogger.info("Payment completed, stopping poll");
        return;
      }

      // Continue polling with exponential backoff
      attempts++;
      const interval = attempts > 10 ? baseInterval * 2 : baseInterval;
      timeoutId = window.setTimeout(poll, interval);
    } catch (error) {
      paymentLogger.error("Payment status poll failed", error);

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

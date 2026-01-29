/**
 * PaymentPendingGuard - Route guard for payment-pending users
 *
 * This component wraps protected routes and redirects users with
 * payment_pending=true to the payment page.
 *
 * Features:
 * - Polls payment status with exponential backoff
 * - Forces logout/re-login on payment completion (session rotation)
 * - Shows PaymentPendingPage if payment is still pending
 * - Allows content access if payment is completed
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import logger from '@/utils/logger';
import PaymentPendingPage from '@/pages/payment/PaymentPendingPage';

const paymentLogger = logger.scope('PaymentPendingGuard');

interface Props {
  children: React.ReactNode;
}

export default function PaymentPendingGuard({ children }: Props) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [pollingAttempts, setPollingAttempts] = useState(0);
  const maxAttempts = 60; // 5 minutes max with base 5s interval

  useEffect(() => {
    if (!user?.payment_pending) {
      // User doesn't need payment - allow access
      return;
    }

    // User has payment_pending=true - start polling
    paymentLogger.info('User has payment_pending=true - starting status polling', {
      user_id: user.id,
      pending_plan_id: user.pending_plan_id,
    });

    const baseInterval = parseInt(
      import.meta.env.REACT_APP_PAYMENT_STATUS_POLL_INTERVAL_MS || '5000'
    );

    const poll = async () => {
      if (pollingAttempts >= maxAttempts) {
        paymentLogger.warn('Max polling attempts reached', {
          attempts: pollingAttempts,
        });
        return; // Stop polling, show refresh button
      }

      try {
        const response = await fetch('/api/v1/auth/payment/status', {
          headers: {
            Authorization: `Bearer ${useAuthStore.getState().token}`,
          },
        });

        if (!response.ok) {
          if (response.status === 401) {
            // Token invalidated - force re-login
            paymentLogger.info('Token invalidated - payment likely completed');
            logout();
            navigate('/login?reason=payment_completed');
            return;
          }
          throw new Error(`HTTP ${response.status}`);
        }

        const status = await response.json();

        if (!status.payment_pending) {
          // Payment completed! Force re-login for session rotation
          paymentLogger.info('Payment completed - forcing re-login for session rotation', {
            user_id: user.id,
          });
          logout();
          navigate('/login?reason=payment_completed&message=Payment%20successful!%20Please%20log%20in%20again.');
          return;
        }

        // Still pending - continue polling
        setPollingAttempts((prev) => prev + 1);

        // Exponential backoff after 10 attempts
        const interval = pollingAttempts > 10 ? baseInterval * 2 : baseInterval;
        setTimeout(poll, interval);
      } catch (error) {
        paymentLogger.error('Failed to check payment status', error);

        // Retry with backoff
        setPollingAttempts((prev) => prev + 1);
        const retryInterval = baseInterval * Math.min(pollingAttempts + 1, 3);
        setTimeout(poll, retryInterval);
      }
    };

    // Start polling
    poll();

    // Cleanup on unmount
    return () => {
      paymentLogger.debug('PaymentPendingGuard unmounted');
    };
  }, [user, logout, navigate, pollingAttempts]);

  // Show payment page if user has payment_pending=true
  if (user?.payment_pending) {
    return (
      <PaymentPendingPage
        checkoutUrl={null} // Generate on-demand
        planId={user.pending_plan_id || 'basic'}
      />
    );
  }

  // Payment completed or not required - render children
  return <>{children}</>;
}

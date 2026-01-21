/**
 * T038: Payments logging in packages/payments/src/logging/PaymentsLogger.ts
 *
 * Specialized logger for payment processing, transaction monitoring, and financial compliance events
  */

import { logger } from '@cvplus/core';

// Re-export the logger for payments-specific usage
export const paymentsLogger: typeof logger = logger;
export default paymentsLogger;
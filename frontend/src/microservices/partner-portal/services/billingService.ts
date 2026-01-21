/**
 * B2B Billing Service
 *
 * Handles billing plans, subscriptions, and invoices.
 * NO HARDCODED VALUES - All configuration from environment variables.
 */

import { b2bGet, b2bPost, b2bDelete } from './b2bApiClient';
import {
  Plan,
  Subscription,
  Invoice,
  CreateSubscriptionRequest,
  CancelSubscriptionRequest,
} from '../types';

const BILLING_ENDPOINTS = {
  PLANS: '/billing/plans',
  SUBSCRIPTION: '/billing/subscription',
  INVOICES: '/billing/invoices',
} as const;

export async function getPlans(): Promise<Plan[]> {
  const response = await b2bGet<Plan[]>(BILLING_ENDPOINTS.PLANS);
  return response.data;
}

export async function getSubscription(): Promise<Subscription | null> {
  try {
    const response = await b2bGet<Subscription>(BILLING_ENDPOINTS.SUBSCRIPTION);
    return response.data;
  } catch (error) {
    const axiosError = error as { response?: { status: number } };
    if (axiosError.response?.status === 404) {
      return null;
    }
    throw error;
  }
}

export async function createSubscription(
  data: CreateSubscriptionRequest
): Promise<Subscription> {
  const response = await b2bPost<Subscription>(
    BILLING_ENDPOINTS.SUBSCRIPTION,
    data
  );
  return response.data;
}

export async function cancelSubscription(
  data?: CancelSubscriptionRequest
): Promise<Subscription> {
  const response = await b2bDelete<Subscription>(
    BILLING_ENDPOINTS.SUBSCRIPTION
  );
  return response.data;
}

export async function getInvoices(): Promise<Invoice[]> {
  const response = await b2bGet<Invoice[]>(BILLING_ENDPOINTS.INVOICES);
  return response.data;
}

export async function getInvoicePdf(invoiceId: string): Promise<string> {
  const response = await b2bGet<{ url: string }>(
    `${BILLING_ENDPOINTS.INVOICES}/${invoiceId}/pdf`
  );
  return response.data.url;
}

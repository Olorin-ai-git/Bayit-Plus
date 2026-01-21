/**
 * B2B Billing Store
 *
 * Zustand store for plans, subscriptions, and invoices management.
 */

import { create } from 'zustand';
import type {
  Plan,
  Subscription,
  Invoice,
  BillingPeriod,
} from '../types';
import { getB2BApiUrl } from '../config/env';
import { getApiClient } from '../services/api';

interface BillingState {
  plans: Plan[];
  subscription: Subscription | null;
  invoices: Invoice[];
  isLoading: boolean;
  error: string | null;

  // Plan Actions
  fetchPlans: () => Promise<void>;

  // Subscription Actions
  fetchSubscription: () => Promise<void>;
  createSubscription: (planId: string, period: BillingPeriod) => Promise<void>;
  updateSubscription: (planId: string, period: BillingPeriod) => Promise<void>;
  cancelSubscription: (reason?: string) => Promise<void>;
  reactivateSubscription: () => Promise<void>;

  // Invoice Actions
  fetchInvoices: () => Promise<void>;
  downloadInvoicePdf: (invoiceId: string) => Promise<string>;

  // Utility
  clearError: () => void;
}

export const useBillingStore = create<BillingState>((set, get) => ({
  plans: [],
  subscription: null,
  invoices: [],
  isLoading: false,
  error: null,

  // Plan Actions
  fetchPlans: async () => {
    set({ isLoading: true, error: null });

    try {
      const client = getApiClient();
      const response = await client.get<{ plans: Plan[] }>(
        getB2BApiUrl('/billing/plans')
      );
      set({ plans: response.data.plans, isLoading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch plans';
      set({ isLoading: false, error: message });
      throw error;
    }
  },

  // Subscription Actions
  fetchSubscription: async () => {
    set({ isLoading: true, error: null });

    try {
      const client = getApiClient();
      const response = await client.get<{ subscription: Subscription | null }>(
        getB2BApiUrl('/billing/subscription')
      );
      set({ subscription: response.data.subscription, isLoading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch subscription';
      set({ isLoading: false, error: message });
      throw error;
    }
  },

  createSubscription: async (planId: string, period: BillingPeriod) => {
    set({ isLoading: true, error: null });

    try {
      const client = getApiClient();
      const response = await client.post<{ subscription: Subscription }>(
        getB2BApiUrl('/billing/subscription'),
        { planId, billingPeriod: period }
      );
      set({ subscription: response.data.subscription, isLoading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create subscription';
      set({ isLoading: false, error: message });
      throw error;
    }
  },

  updateSubscription: async (planId: string, period: BillingPeriod) => {
    set({ isLoading: true, error: null });

    try {
      const client = getApiClient();
      const response = await client.put<{ subscription: Subscription }>(
        getB2BApiUrl('/billing/subscription'),
        { planId, billingPeriod: period }
      );
      set({ subscription: response.data.subscription, isLoading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update subscription';
      set({ isLoading: false, error: message });
      throw error;
    }
  },

  cancelSubscription: async (reason?: string) => {
    set({ isLoading: true, error: null });

    try {
      const client = getApiClient();
      const response = await client.delete<{ subscription: Subscription }>(
        getB2BApiUrl('/billing/subscription'),
        { data: { reason } }
      );
      set({ subscription: response.data.subscription, isLoading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to cancel subscription';
      set({ isLoading: false, error: message });
      throw error;
    }
  },

  reactivateSubscription: async () => {
    set({ isLoading: true, error: null });

    try {
      const client = getApiClient();
      const response = await client.post<{ subscription: Subscription }>(
        getB2BApiUrl('/billing/subscription/reactivate')
      );
      set({ subscription: response.data.subscription, isLoading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to reactivate subscription';
      set({ isLoading: false, error: message });
      throw error;
    }
  },

  // Invoice Actions
  fetchInvoices: async () => {
    set({ isLoading: true, error: null });

    try {
      const client = getApiClient();
      const response = await client.get<{ invoices: Invoice[] }>(
        getB2BApiUrl('/billing/invoices')
      );
      set({ invoices: response.data.invoices, isLoading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch invoices';
      set({ isLoading: false, error: message });
      throw error;
    }
  },

  downloadInvoicePdf: async (invoiceId: string) => {
    const { invoices } = get();
    const invoice = invoices.find((i) => i.id === invoiceId);

    if (invoice?.pdfUrl) {
      return invoice.pdfUrl;
    }

    try {
      const client = getApiClient();
      const response = await client.get<{ pdfUrl: string }>(
        getB2BApiUrl(`/billing/invoices/${invoiceId}/pdf`)
      );
      return response.data.pdfUrl;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get invoice PDF';
      set({ error: message });
      throw error;
    }
  },

  clearError: () => set({ error: null }),
}));

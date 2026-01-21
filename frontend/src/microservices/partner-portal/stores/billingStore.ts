/**
 * B2B Billing Store
 *
 * Zustand store for billing plans, subscriptions, and invoices.
 * NO HARDCODED VALUES - All configuration from environment variables.
 */

import { create } from 'zustand';
import {
  Plan,
  Subscription,
  Invoice,
  CreateSubscriptionRequest,
  CancelSubscriptionRequest,
} from '../types';
import * as billingService from '../services/billingService';

interface BillingState {
  plans: Plan[];
  subscription: Subscription | null;
  invoices: Invoice[];
  isLoading: boolean;
  error: string | null;

  fetchPlans: () => Promise<void>;
  fetchSubscription: () => Promise<void>;
  createSubscription: (data: CreateSubscriptionRequest) => Promise<void>;
  cancelSubscription: (data?: CancelSubscriptionRequest) => Promise<void>;
  fetchInvoices: () => Promise<void>;
  getInvoicePdf: (invoiceId: string) => Promise<string>;

  clearError: () => void;
  reset: () => void;
}

const initialState = {
  plans: [],
  subscription: null,
  invoices: [],
  isLoading: false,
  error: null,
};

export const useBillingStore = create<BillingState>((set) => ({
  ...initialState,

  fetchPlans: async () => {
    set({ isLoading: true, error: null });
    try {
      const plans = await billingService.getPlans();
      set({ plans, isLoading: false });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to fetch plans';
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  fetchSubscription: async () => {
    set({ isLoading: true, error: null });
    try {
      const subscription = await billingService.getSubscription();
      set({ subscription, isLoading: false });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to fetch subscription';
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  createSubscription: async (data: CreateSubscriptionRequest) => {
    set({ isLoading: true, error: null });
    try {
      const subscription = await billingService.createSubscription(data);
      set({ subscription, isLoading: false });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to create subscription';
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  cancelSubscription: async (data?: CancelSubscriptionRequest) => {
    set({ isLoading: true, error: null });
    try {
      const subscription = await billingService.cancelSubscription(data);
      set({ subscription, isLoading: false });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to cancel subscription';
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  fetchInvoices: async () => {
    set({ isLoading: true, error: null });
    try {
      const invoices = await billingService.getInvoices();
      set({ invoices, isLoading: false });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to fetch invoices';
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  getInvoicePdf: async (invoiceId: string) => {
    try {
      return await billingService.getInvoicePdf(invoiceId);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to get invoice PDF';
      set({ error: message });
      throw error;
    }
  },

  clearError: () => set({ error: null }),

  reset: () => set(initialState),
}));

export const usePlans = () => useBillingStore((state) => state.plans);

export const useSubscription = () =>
  useBillingStore((state) => state.subscription);

export const useInvoices = () => useBillingStore((state) => state.invoices);

export const useBillingLoading = () =>
  useBillingStore((state) => state.isLoading);

export const useBillingError = () => useBillingStore((state) => state.error);

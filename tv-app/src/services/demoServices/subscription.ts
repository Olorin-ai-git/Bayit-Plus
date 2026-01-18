/**
 * DEMO-ONLY: Demo subscription and billing service.
 * Not used in production.
 */

import { delay } from './delay';

export const demoSubscriptionService = {
  getPlans: async () => {
    await delay();
    return {
      plans: [
        { id: 'basic', name: 'בסיסי', price: 9.99, currency: 'ILS', interval: 'month', features: ['צפייה ב-HD', '1 מכשיר'] },
        { id: 'premium', name: 'פרימיום', price: 29.90, currency: 'ILS', interval: 'month', features: ['צפייה ב-4K', '4 מכשירים', 'הורדות'] },
        { id: 'family', name: 'משפחתי', price: 49.90, currency: 'ILS', interval: 'month', features: ['צפייה ב-4K', '6 מכשירים', 'הורדות', '5 פרופילים'] },
      ],
    };
  },
  getCurrentPlan: async () => {
    await delay();
    return { plan: 'premium', status: 'active', expires_at: '2025-12-31T23:59:59Z' };
  },
  createCheckout: async (planId: string) => {
    await delay();
    return { checkout_url: '#demo-checkout' };
  },
  cancelSubscription: async () => {
    await delay();
    return { message: 'Subscription cancelled' };
  },
  getInvoices: async () => {
    await delay();
    return {
      invoices: [
        { id: 'inv-1', date: '2025-01-01', amount: 29.90, currency: 'ILS', status: 'paid', description: 'מנוי פרימיום - ינואר' },
        { id: 'inv-2', date: '2024-12-01', amount: 29.90, currency: 'ILS', status: 'paid', description: 'מנוי פרימיום - דצמבר' },
        { id: 'inv-3', date: '2024-11-01', amount: 29.90, currency: 'ILS', status: 'paid', description: 'מנוי פרימיום - נובמבר' },
      ],
    };
  },
  getPaymentMethods: async () => {
    await delay();
    return {
      payment_methods: [
        { id: 'pm-1', type: 'visa', last4: '4242', expiry: '12/25', is_default: true },
        { id: 'pm-2', type: 'mastercard', last4: '8888', expiry: '06/26', is_default: false },
      ],
    };
  },
  addPaymentMethod: async (token: string) => {
    await delay();
    return { message: 'Payment method added', id: 'pm-new' };
  },
  removePaymentMethod: async (methodId: string) => {
    await delay();
    return { message: 'Payment method removed' };
  },
  setDefaultPaymentMethod: async (methodId: string) => {
    await delay();
    return { message: 'Default payment method set' };
  },
};

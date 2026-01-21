
export interface CheckoutSession {
  id: string;
  url: string;
  customerId?: string;
  paymentIntentId?: string;
  subscriptionId?: string;
  mode: 'payment' | 'setup' | 'subscription';
}
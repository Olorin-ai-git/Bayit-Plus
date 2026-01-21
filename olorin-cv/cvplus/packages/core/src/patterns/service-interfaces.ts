/**
 * CVPlus Service Interfaces
 * Define contracts for cross-layer service communication
  */

// Subscription Service Interface
export interface ISubscriptionService {
  getUserSubscription(userId: string): Promise<UserSubscriptionData>;
  invalidateCache(userId: string): Promise<void>;
  checkFeatureAccess(userId: string, feature: string): Promise<boolean>;
  updateSubscription(userId: string, subscriptionData: Partial<UserSubscriptionData>): Promise<void>;
}

export interface UserSubscriptionData {
  userId: string;
  subscriptionStatus: 'free' | 'premium' | 'enterprise';
  tier: string;
  active: boolean;
  lifetimeAccess: boolean;
  features: Record<string, boolean>;
  expiresAt?: Date;
  billingCycle?: 'monthly' | 'yearly';
}

// Feature Registry Interface
export interface IFeatureRegistry {
  getFeature(featureId: string): Feature | undefined;
  isFeatureEnabled(featureId: string, userId: string): Promise<boolean>;
  getFeatureConfig(featureId: string): Promise<FeatureConfig>;
  listFeaturesByTier(tier: string): Feature[];
}

export interface Feature {
  id: string;
  name: string;
  description: string;
  tier: 'free' | 'premium' | 'enterprise';
  enabled: boolean;
  config?: Record<string, any>;
}

export interface FeatureConfig {
  limits?: {
    daily?: number;
    monthly?: number;
    perRequest?: number;
  };
  settings?: Record<string, any>;
  requirements?: string[];
}

// Payment Processor Interface
export interface IPaymentProcessor {
  processPayment(paymentData: PaymentRequest): Promise<PaymentResult>;
  refundPayment(paymentId: string, amount?: number): Promise<RefundResult>;
  createSubscription(subscriptionData: SubscriptionRequest): Promise<SubscriptionResult>;
  cancelSubscription(subscriptionId: string): Promise<void>;
}

export interface PaymentRequest {
  userId: string;
  amount: number;
  currency: string;
  paymentMethodId: string;
  description?: string;
  metadata?: Record<string, string>;
}

export interface PaymentResult {
  paymentId: string;
  status: 'succeeded' | 'failed' | 'pending';
  amount: number;
  currency: string;
  error?: string;
}

export interface SubscriptionRequest {
  userId: string;
  planId: string;
  paymentMethodId: string;
  billingCycle: 'monthly' | 'yearly';
}

export interface SubscriptionResult {
  subscriptionId: string;
  status: 'active' | 'incomplete' | 'failed';
  currentPeriodEnd: Date;
  error?: string;
}

export interface RefundResult {
  refundId: string;
  status: 'succeeded' | 'failed' | 'pending';
  amount: number;
  error?: string;
}

// Analytics Tracker Interface
export interface IAnalyticsTracker {
  trackEvent(event: string, properties: Record<string, any>): Promise<void>;
  trackUser(userId: string, properties: Record<string, any>): Promise<void>;
  trackFeatureUsage(userId: string, feature: string, metadata?: Record<string, any>): Promise<void>;
  generateReport(query: AnalyticsQuery): Promise<AnalyticsReport>;
}

export interface AnalyticsQuery {
  startDate: Date;
  endDate: Date;
  metrics: string[];
  filters?: Record<string, any>;
  groupBy?: string[];
}

export interface AnalyticsReport {
  data: Record<string, any>[];
  summary: Record<string, number>;
  metadata: {
    generatedAt: Date;
    query: AnalyticsQuery;
    totalRecords: number;
  };
}

// Notification Service Interface
export interface INotificationService {
  sendEmail(emailData: EmailRequest): Promise<void>;
  sendSMS(smsData: SMSRequest): Promise<void>;
  sendPushNotification(pushData: PushNotificationRequest): Promise<void>;
  createNotificationTemplate(template: NotificationTemplate): Promise<string>;
}

export interface EmailRequest {
  to: string[];
  subject: string;
  body: string;
  html?: string;
  template?: string;
  data?: Record<string, any>;
}

export interface SMSRequest {
  to: string;
  message: string;
  template?: string;
  data?: Record<string, any>;
}

export interface PushNotificationRequest {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  imageUrl?: string;
}

export interface NotificationTemplate {
  id: string;
  name: string;
  type: 'email' | 'sms' | 'push';
  subject?: string;
  body: string;
  variables: string[];
}

// Auth Service Interface (for reference)
export interface IAuthService {
  authenticate(token: string): Promise<AuthResult>;
  authorize(userId: string, permission: string): Promise<boolean>;
  getUserPermissions(userId: string): Promise<string[]>;
  createCustomToken(userId: string, additionalClaims?: Record<string, any>): Promise<string>;
}

export interface AuthResult {
  userId: string;
  email: string;
  verified: boolean;
  permissions: string[];
  customClaims?: Record<string, any>;
}
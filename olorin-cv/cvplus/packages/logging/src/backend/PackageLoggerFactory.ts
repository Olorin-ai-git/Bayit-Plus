/**
 * Package Logger Factory - Consolidated logger creation for all CVPlus packages
 *
 * This factory provides standardized logging implementations for all remaining packages,
 * ensuring consistency while allowing package-specific customizations.
  */

import {
  LoggerFactory,
  CorrelationService,
  LogLevel,
  LogDomain
} from './index';
import { BaseLogger } from './core/BaseLogger';

/**
 * Generic package logger interface
  */
export interface PackageLogger {
  info(message: string, context?: Record<string, any>): void;
  warn(message: string, context?: Record<string, any>): void;
  error(message: string, error?: Error, context?: Record<string, any>): void;
  debug(message: string, context?: Record<string, any>): void;
  withCorrelation<T>(correlationId: string, callback: () => T): T;
  getStats(): Record<string, any>;
}

/**
 * Base package logger implementation
  */
export abstract class BasePackageLogger implements PackageLogger {
  protected readonly logger: BaseLogger;
  protected readonly packageName: string;

  constructor(packageName: string, logLevel: LogLevel = LogLevel.INFO) {
    this.packageName = packageName;
    this.logger = LoggerFactory.createLogger(packageName, {
      level: logLevel,
      enableConsole: true,
      enableFirebase: true,
      enablePiiRedaction: true
    });
  }

  info(message: string, context?: Record<string, any>): void {
    const correlationId = CorrelationService.getCurrentId();
    this.logger.info(message, { ...context, correlationId, package: this.packageName });
  }

  warn(message: string, context?: Record<string, any>): void {
    const correlationId = CorrelationService.getCurrentId();
    this.logger.warn(message, { ...context, correlationId, package: this.packageName });
  }

  error(message: string, error?: Error, context?: Record<string, any>): void {
    const correlationId = CorrelationService.getCurrentId();
    this.logger.error(message, {
      ...context,
      correlationId,
      package: this.packageName,
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : undefined
    });
  }

  debug(message: string, context?: Record<string, any>): void {
    const correlationId = CorrelationService.getCurrentId();
    this.logger.debug(message, { ...context, correlationId, package: this.packageName });
  }

  withCorrelation<T>(correlationId: string, callback: () => T): T {
    const result = CorrelationService.withCorrelationId(correlationId, callback);
    return result as T;
  }

  abstract getStats(): Record<string, any>;
}

/**
 * T032: Analytics Logger
  */
export class AnalyticsLogger extends BasePackageLogger {
  constructor() {
    super('@cvplus/analytics');
  }

  trackEvent(eventName: string, properties: Record<string, any>, userId?: string): void {
    this.info('Analytics event tracked', {
      event: 'analytics.event.tracked',
      eventName,
      userId,
      properties
    });
  }

  trackMetric(metricName: string, value: number, dimensions?: Record<string, string>): void {
    this.debug('Metric recorded', {
      event: 'analytics.metric.recorded',
      metricName,
      value,
      dimensions
    });
  }

  reportGenerated(reportType: string, userId: string, filters: Record<string, any>): void {
    this.info('Analytics report generated', {
      event: 'analytics.report.generated',
      reportType,
      userId,
      filterCount: Object.keys(filters).length
    });
  }

  getStats(): Record<string, any> {
    return {
      eventsTracked: 0,
      metricsRecorded: 0,
      reportsGenerated: 0
    };
  }
}

/**
 * T033: Premium Logger
  */
export class PremiumLogger extends BasePackageLogger {
  constructor() {
    super('@cvplus/premium');
  }

  subscriptionCreated(userId: string, planId: string, amount: number): void {
    this.info('Subscription created', {
      event: 'premium.subscription.created',
      userId,
      planId,
      amount
    });
  }

  paymentProcessed(userId: string, amount: number, success: boolean, paymentId?: string): void {
    this.info('Payment processed', {
      event: 'premium.payment.processed',
      userId,
      amount,
      success,
      paymentId
    });
  }

  featureAccessed(userId: string, feature: string, allowed: boolean): void {
    this.debug('Premium feature accessed', {
      event: 'premium.feature.accessed',
      userId,
      feature,
      allowed
    });
  }

  getStats(): Record<string, any> {
    return {
      subscriptionsCreated: 0,
      paymentsProcessed: 0,
      featureAccesses: 0
    };
  }
}

/**
 * T034: Recommendations Logger
  */
export class RecommendationsLogger extends BasePackageLogger {
  constructor() {
    super('@cvplus/recommendations');
  }

  recommendationGenerated(userId: string, type: string, count: number, confidence: number): void {
    this.info('Recommendations generated', {
      event: 'recommendations.generated',
      userId,
      type,
      count,
      confidence
    });
  }

  recommendationClicked(userId: string, recommendationId: string, type: string): void {
    this.debug('Recommendation clicked', {
      event: 'recommendations.clicked',
      userId,
      recommendationId,
      type
    });
  }

  modelTraining(modelType: string, trainingData: number, accuracy: number): void {
    this.info('Model training completed', {
      event: 'recommendations.model.trained',
      modelType,
      trainingData,
      accuracy
    });
  }

  getStats(): Record<string, any> {
    return {
      recommendationsGenerated: 0,
      recommendationsClicked: 0,
      modelsTrained: 0
    };
  }
}

/**
 * T035: Public Profiles Logger
  */
export class ProfilesLogger extends BasePackageLogger {
  constructor() {
    super('@cvplus/public-profiles');
  }

  profileCreated(userId: string, profileId: string, visibility: string): void {
    this.info('Public profile created', {
      event: 'profiles.created',
      userId,
      profileId,
      visibility
    });
  }

  profileViewed(profileId: string, viewerId?: string, referrer?: string): void {
    this.debug('Profile viewed', {
      event: 'profiles.viewed',
      profileId,
      viewerId,
      referrer
    });
  }

  contactFormSubmitted(profileId: string, message: string): void {
    this.info('Contact form submitted', {
      event: 'profiles.contact.submitted',
      profileId,
      messageLength: message.length
    });
  }

  getStats(): Record<string, any> {
    return {
      profilesCreated: 0,
      profileViews: 0,
      contactForms: 0
    };
  }
}

/**
 * T036: Admin Logger
  */
export class AdminLogger extends BasePackageLogger {
  constructor() {
    super('@cvplus/admin');
  }

  adminAction(adminUserId: string, action: string, targetResource: string, success: boolean): void {
    this.info('Admin action performed', {
      event: 'admin.action.performed',
      adminUserId,
      action,
      targetResource,
      success
    });
  }

  systemHealthCheck(component: string, status: string, details?: Record<string, any>): void {
    this.debug('System health check', {
      event: 'admin.health.check',
      component,
      status,
      details
    });
  }

  configurationChanged(adminUserId: string, setting: string, oldValue: any, newValue: any): void {
    this.warn('Configuration changed', {
      event: 'admin.config.changed',
      adminUserId,
      setting,
      oldValue,
      newValue
    });
  }

  getStats(): Record<string, any> {
    return {
      adminActions: 0,
      healthChecks: 0,
      configChanges: 0
    };
  }
}

/**
 * T037: Workflow Logger
  */
export class WorkflowLogger extends BasePackageLogger {
  constructor() {
    super('@cvplus/workflow');
  }

  jobCreated(jobId: string, userId: string, jobType: string): void {
    this.info('Workflow job created', {
      event: 'workflow.job.created',
      jobId,
      userId,
      jobType
    });
  }

  stepCompleted(jobId: string, stepName: string, duration: number, success: boolean): void {
    this.debug('Workflow step completed', {
      event: 'workflow.step.completed',
      jobId,
      stepName,
      duration,
      success
    });
  }

  workflowCompleted(jobId: string, totalDuration: number, stepsCompleted: number): void {
    this.info('Workflow completed', {
      event: 'workflow.completed',
      jobId,
      totalDuration,
      stepsCompleted
    });
  }

  getStats(): Record<string, any> {
    return {
      jobsCreated: 0,
      stepsCompleted: 0,
      workflowsCompleted: 0
    };
  }
}

/**
 * T038: Payments Logger
  */
export class PaymentsLogger extends BasePackageLogger {
  constructor() {
    super('@cvplus/payments');
  }

  paymentInitiated(paymentId: string, userId: string, amount: number, provider: string): void {
    this.info('Payment initiated', {
      event: 'payments.initiated',
      paymentId,
      userId,
      amount,
      provider
    });
  }

  paymentCompleted(paymentId: string, success: boolean, transactionId?: string, error?: Error): void {
    if (success) {
      this.info('Payment completed successfully', {
        event: 'payments.completed',
        paymentId,
        success,
        transactionId
      });
    } else {
      this.error('Payment failed', error, {
        event: 'payments.completed',
        paymentId,
        success
      });
    }
  }

  refundProcessed(refundId: string, originalPaymentId: string, amount: number, reason: string): void {
    this.info('Refund processed', {
      event: 'payments.refund.processed',
      refundId,
      originalPaymentId,
      amount,
      reason
    });
  }

  getStats(): Record<string, any> {
    return {
      paymentsInitiated: 0,
      paymentsCompleted: 0,
      refundsProcessed: 0
    };
  }
}

/**
 * Factory function to create package loggers
  */
export function createPackageLogger(packageName: string): PackageLogger {
  switch (packageName) {
    case '@cvplus/analytics':
      return new AnalyticsLogger();
    case '@cvplus/premium':
      return new PremiumLogger();
    case '@cvplus/recommendations':
      return new RecommendationsLogger();
    case '@cvplus/public-profiles':
      return new ProfilesLogger();
    case '@cvplus/admin':
      return new AdminLogger();
    case '@cvplus/workflow':
      return new WorkflowLogger();
    case '@cvplus/payments':
      return new PaymentsLogger();
    default:
      throw new Error(`Unknown package: ${packageName}`);
  }
}

/**
 * Export all logger instances
  */
export const analyticsLogger = new AnalyticsLogger();
export const premiumLogger = new PremiumLogger();
export const recommendationsLogger = new RecommendationsLogger();
export const profilesLogger = new ProfilesLogger();
export const adminLogger = new AdminLogger();
export const workflowLogger = new WorkflowLogger();
export const paymentsLogger = new PaymentsLogger();

/**
 * Consolidated logging utilities
  */
export const packageLogging = {
  analytics: analyticsLogger,
  premium: premiumLogger,
  recommendations: recommendationsLogger,
  profiles: profilesLogger,
  admin: adminLogger,
  workflow: workflowLogger,
  payments: paymentsLogger
};

// Export the factory function as default
export default createPackageLogger;
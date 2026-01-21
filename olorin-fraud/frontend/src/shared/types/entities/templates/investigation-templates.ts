/**
 * Investigation Templates
 * Common entity combination patterns with weights
 * Feature: 005-polling-and-persistence
 */

import type { EntityType, InvestigationTemplate } from '../types/entity-types';

/**
 * Common entity combination patterns with weights
 * Predefined templates for typical investigation scenarios
 */
export const COMMON_ENTITY_COMBINATIONS: Record<string, InvestigationTemplate> = {
  USER_DEVICE_INVESTIGATION: {
    name: 'User + Device Investigation',
    description:
      'Investigate user and their primary device for account takeover patterns',
    entities: [
      { entityType: 'user_id' as EntityType, weight: 1.0, isPrimary: true },
      { entityType: 'device_exact_id' as EntityType, weight: 1.0 },
    ],
    correlationMode: 'AND',
    useCase: 'Account Takeover (ATO) Detection',
  },
  USER_EMAIL_PHONE: {
    name: 'User Identity Investigation',
    description:
      'Complete user identity check across multiple contact methods',
    entities: [
      { entityType: 'user_id' as EntityType, weight: 1.0, isPrimary: true },
      { entityType: 'email' as EntityType, weight: 0.8 },
      { entityType: 'phone' as EntityType, weight: 0.8 },
    ],
    correlationMode: 'OR',
    useCase: 'Identity Verification',
  },
  DEVICE_IP_INVESTIGATION: {
    name: 'Device + Network Investigation',
    description: 'Analyze device behavior and network context',
    entities: [
      {
        entityType: 'device_exact_id' as EntityType,
        weight: 1.0,
        isPrimary: true,
      },
      { entityType: 'ip_address' as EntityType, weight: 0.7 },
    ],
    correlationMode: 'AND',
    useCase: 'Device Fraud Detection',
  },
  PAYMENT_FRAUD_INVESTIGATION: {
    name: 'Payment Fraud Investigation',
    description: 'Comprehensive payment fraud analysis',
    entities: [
      { entityType: 'user_id' as EntityType, weight: 1.0, isPrimary: true },
      { entityType: 'hashed_cc_number' as EntityType, weight: 1.5 },
      { entityType: 'merchant' as EntityType, weight: 0.8 },
      { entityType: 'device_exact_id' as EntityType, weight: 0.9 },
    ],
    correlationMode: 'AND',
    useCase: 'Payment Fraud Detection',
  },
  EMAIL_DOMAIN_INVESTIGATION: {
    name: 'Email Domain Investigation',
    description: 'Investigate suspicious email domain and related emails',
    entities: [
      {
        entityType: 'email_domain' as EntityType,
        weight: 1.0,
        isPrimary: true,
      },
      { entityType: 'email' as EntityType, weight: 0.9 },
    ],
    correlationMode: 'OR',
    useCase: 'Email-based Fraud Detection',
  },
  BUSINESS_INVESTIGATION: {
    name: 'Business Entity Investigation',
    description: 'Comprehensive business fraud analysis',
    entities: [
      { entityType: 'merchant' as EntityType, weight: 1.0, isPrimary: true },
      { entityType: 'fein' as EntityType, weight: 1.2 },
      { entityType: 'dda' as EntityType, weight: 0.9 },
      { entityType: 'email' as EntityType, weight: 0.7 },
    ],
    correlationMode: 'AND',
    useCase: 'Business Fraud Detection',
  },
};

/** Type for template keys */
export type CommonEntityCombination = keyof typeof COMMON_ENTITY_COMBINATIONS;

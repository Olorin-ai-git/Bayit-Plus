/**
 * Entity Type Constants
 * All supported entity types for Olorin investigations
 * Feature: 005-polling-and-persistence
 */

// All supported entity types
export const ENTITY_TYPES = {
  // User/Identity Entities
  USER_ID: 'user_id',
  REALM: 'realm',
  SSN: 'ssn',
  FEIN: 'fein',
  BUYER_ID: 'buyer_id',

  // Device Entities
  DEVICE_ID: 'device_id', // Legacy device type for backward compatibility
  DEVICE_EXACT_ID: 'device_exact_id',
  DEVICE_DIGITAL_ID: 'device_digital_id',
  DEVICE_SMART_ID: 'device_smart_id',

  // Contact Information
  EMAIL: 'email',
  PHONE: 'phone',
  EMAIL_DOMAIN: 'email_domain',

  // Financial Entities
  DDA: 'dda',
  DDA_ACC_TYPE: 'dda_acc_type',
  HASHED_CC_NUMBER: 'hashed_cc_number',

  // Merchant/Business Entities
  PAYMENTS_MERCHANT: 'payments_merchant',
  CAPITAL_MERCHANT: 'capital_merchant',
  IOP_COMPANY: 'iop_company',
  MERCHANT: 'merchant',

  // Desktop Entities
  DESKTOP_CONTACT: 'desktop_contact',
  DESKTOP_COMPANY: 'desktop_company',

  // Network Entities
  IP_ADDRESS: 'ip_address',
  URL: 'url',

  // Application Entities
  APP_ID: 'app_id',
  APP_ASSET_ID: 'app_asset_id',
  APP_REDIRECT_URL: 'app_redirect_url',
  APP_CLIENT_ID: 'app_client_id',
  APP_AUTHORIZATION: 'app_authorization',
} as const;

// Union type for all entity types
export type EntityType = (typeof ENTITY_TYPES)[keyof typeof ENTITY_TYPES];

// Legacy type alias for backward compatibility
export type LegacyEntityType = 'user_id' | 'device_id';

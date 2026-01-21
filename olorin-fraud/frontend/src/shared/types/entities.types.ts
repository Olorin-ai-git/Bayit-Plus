/**
 * Entity Type Definitions
 * Feature: 004-new-olorin-frontend
 *
 * Entity-related types and enums for investigation entities.
 */

import { z } from 'zod';
import { EntitySchema } from './wizard.schemas';

// Entity Types
export enum EntityType {
  USER_ID = 'user_id',
  EMAIL = 'email',
  IP_ADDRESS = 'ip_address',
  DEVICE_ID = 'device_id',
  PHONE_NUMBER = 'phone_number',
  TRANSACTION_ID = 'transaction_id',
  ACCOUNT_ID = 'account_id'
}

// Entity Type Definition
export type Entity = z.infer<typeof EntitySchema>;

/**
 * Entity display labels for UI
 */
export const ENTITY_TYPE_LABELS: Record<EntityType, string> = {
  [EntityType.USER_ID]: 'User ID',
  [EntityType.EMAIL]: 'Email Address',
  [EntityType.IP_ADDRESS]: 'IP Address',
  [EntityType.DEVICE_ID]: 'Device ID',
  [EntityType.PHONE_NUMBER]: 'Phone Number',
  [EntityType.TRANSACTION_ID]: 'Transaction ID',
  [EntityType.ACCOUNT_ID]: 'Account ID'
};

/**
 * Entity validation patterns
 */
export const ENTITY_VALIDATION_PATTERNS: Record<EntityType, RegExp> = {
  [EntityType.USER_ID]: /.+/,
  [EntityType.EMAIL]: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  [EntityType.IP_ADDRESS]: /^(\d{1,3}\.){3}\d{1,3}$/,
  [EntityType.DEVICE_ID]: /.+/,
  [EntityType.PHONE_NUMBER]: /^\+?[\d\s\-()]+$/,
  [EntityType.TRANSACTION_ID]: /.+/,
  [EntityType.ACCOUNT_ID]: /.+/
};

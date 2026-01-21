/**
 * Financial Entity Configurations
 * DDA, hashed CC number, and account type entities
 * Feature: 005-polling-and-persistence
 */

import { ENTITY_TYPES } from '../constants/entity-type-constants';
import { EntityCategory } from '../types/entity-types';
import type { EntityType, EntityTypeConfig } from '../types/entity-types';

/** Financial entity configurations (Priority 30-35) */
export const FINANCIAL_ENTITY_CONFIGS: Record<string, EntityTypeConfig> = {
  [ENTITY_TYPES.DDA]: {
    id: ENTITY_TYPES.DDA as EntityType,
    label: 'Bank Account (DDA)',
    description: 'Investigation based on Demand Deposit Account',
    category: EntityCategory.FINANCIAL,
    icon: 'banknotes',
    placeholder: 'Enter account number',
    examples: ['12345678901', 'acc_12345'],
    priority: 30,
  },
  [ENTITY_TYPES.HASHED_CC_NUMBER]: {
    id: ENTITY_TYPES.HASHED_CC_NUMBER as EntityType,
    label: 'Credit Card (Hashed)',
    description: 'Investigation based on hashed credit card number',
    category: EntityCategory.FINANCIAL,
    icon: 'credit-card',
    placeholder: 'Enter hashed CC number',
    examples: ['hash_abc123def456', 'cc_hash_789'],
    priority: 31,
  },
  [ENTITY_TYPES.DDA_ACC_TYPE]: {
    id: ENTITY_TYPES.DDA_ACC_TYPE as EntityType,
    label: 'Account Type',
    description: 'Investigation based on DDA account type',
    category: EntityCategory.FINANCIAL,
    icon: 'document-text',
    placeholder: 'Enter account type',
    examples: ['checking', 'savings', 'business'],
    priority: 32,
  },
};

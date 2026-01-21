/**
 * Business Entity Configurations
 * Merchant, company, and contact entities
 * Feature: 005-polling-and-persistence
 */

import { ENTITY_TYPES } from '../constants/entity-type-constants';
import { EntityCategory } from '../types/entity-types';
import type { EntityType, EntityTypeConfig } from '../types/entity-types';

/** Business entity configurations (Priority 40-45) */
export const BUSINESS_ENTITY_CONFIGS: Record<string, EntityTypeConfig> = {
  [ENTITY_TYPES.MERCHANT]: {
    id: ENTITY_TYPES.MERCHANT as EntityType,
    label: 'Merchant ID',
    description: 'Investigation based on merchant identifier',
    category: EntityCategory.BUSINESS,
    icon: 'building-storefront',
    placeholder: 'Enter merchant ID',
    examples: ['merchant_12345', 'store_abc'],
    priority: 40,
  },
  [ENTITY_TYPES.PAYMENTS_MERCHANT]: {
    id: ENTITY_TYPES.PAYMENTS_MERCHANT as EntityType,
    label: 'Payments Merchant',
    description: 'Investigation based on payments merchant identifier',
    category: EntityCategory.BUSINESS,
    icon: 'currency-dollar',
    placeholder: 'Enter payments merchant ID',
    examples: ['pay_merchant_123', 'pm_abc456'],
    priority: 41,
  },
  [ENTITY_TYPES.CAPITAL_MERCHANT]: {
    id: ENTITY_TYPES.CAPITAL_MERCHANT as EntityType,
    label: 'Capital Merchant',
    description: 'Investigation based on capital merchant identifier',
    category: EntityCategory.BUSINESS,
    icon: 'chart-bar',
    placeholder: 'Enter capital merchant ID',
    examples: ['cap_merchant_123', 'cm_abc456'],
    priority: 42,
  },
  [ENTITY_TYPES.IOP_COMPANY]: {
    id: ENTITY_TYPES.IOP_COMPANY as EntityType,
    label: 'IOP Company',
    description: 'Investigation based on IOP company identifier',
    category: EntityCategory.BUSINESS,
    icon: 'building-office-2',
    placeholder: 'Enter IOP company ID',
    examples: ['iop_company_123', 'iop_abc456'],
    priority: 43,
  },
  [ENTITY_TYPES.DESKTOP_CONTACT]: {
    id: ENTITY_TYPES.DESKTOP_CONTACT as EntityType,
    label: 'Desktop Contact',
    description: 'Investigation based on desktop contact identifier',
    category: EntityCategory.BUSINESS,
    icon: 'user-circle',
    placeholder: 'Enter desktop contact ID',
    examples: ['desktop_contact_123', 'dc_abc456'],
    priority: 44,
  },
  [ENTITY_TYPES.DESKTOP_COMPANY]: {
    id: ENTITY_TYPES.DESKTOP_COMPANY as EntityType,
    label: 'Desktop Company',
    description: 'Investigation based on desktop company identifier',
    category: EntityCategory.BUSINESS,
    icon: 'building-office',
    placeholder: 'Enter desktop company ID',
    examples: ['desktop_company_123', 'dco_abc456'],
    priority: 45,
  },
};

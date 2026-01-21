/**
 * Canonical User Types
 * SINGLE SOURCE OF TRUTH for all user-related types
 */

import { BaseEntity } from './base.types';

export type UserRole = 'admin' | 'investigator' | 'analyst' | 'viewer';

export interface Permission {
  id: string;
  resource: string;
  action: string;
  conditions?: Record<string, any>;
}

/**
 * User interface - used across all services
 * This is the ONLY user type definition in the codebase
 */
export interface User extends BaseEntity {
  email: string;
  name: string;
  role: UserRole;
  permissions: Permission[];
  isActive: boolean;
  lastLogin?: Date;
}

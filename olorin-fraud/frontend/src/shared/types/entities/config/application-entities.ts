/**
 * Application Entity Configurations
 * App ID, asset ID, redirect URL, client ID, and authorization entities
 * Feature: 005-polling-and-persistence
 */

import { ENTITY_TYPES } from '../constants/entity-type-constants';
import { EntityCategory } from '../types/entity-types';
import type { EntityType, EntityTypeConfig } from '../types/entity-types';

/** Application entity configurations (Priority 60-65) */
export const APPLICATION_ENTITY_CONFIGS: Record<string, EntityTypeConfig> = {
  [ENTITY_TYPES.APP_ID]: {
    id: ENTITY_TYPES.APP_ID as EntityType,
    label: 'Application ID',
    description: 'Investigation based on application identifier',
    category: EntityCategory.APPLICATION,
    icon: 'squares-2x2',
    placeholder: 'Enter app ID',
    examples: ['app_12345', 'mobile_app_abc'],
    priority: 60,
  },
  [ENTITY_TYPES.APP_ASSET_ID]: {
    id: ENTITY_TYPES.APP_ASSET_ID as EntityType,
    label: 'App Asset ID',
    description: 'Investigation based on application asset identifier',
    category: EntityCategory.APPLICATION,
    icon: 'cube',
    placeholder: 'Enter app asset ID',
    examples: ['asset_12345', 'app_asset_abc'],
    priority: 61,
  },
  [ENTITY_TYPES.APP_REDIRECT_URL]: {
    id: ENTITY_TYPES.APP_REDIRECT_URL as EntityType,
    label: 'App Redirect URL',
    description: 'Investigation based on application redirect URL',
    category: EntityCategory.APPLICATION,
    icon: 'arrow-top-right-on-square',
    validationPattern: /^https?:\/\/.+/,
    placeholder: 'https://app.example.com/callback',
    examples: [
      'https://app.example.com/callback',
      'https://oauth.app.com/redirect',
    ],
    priority: 62,
  },
  [ENTITY_TYPES.APP_CLIENT_ID]: {
    id: ENTITY_TYPES.APP_CLIENT_ID as EntityType,
    label: 'App Client ID',
    description: 'Investigation based on OAuth client identifier',
    category: EntityCategory.APPLICATION,
    icon: 'identification',
    placeholder: 'Enter client ID',
    examples: ['client_12345', 'oauth_client_abc'],
    priority: 63,
  },
  [ENTITY_TYPES.APP_AUTHORIZATION]: {
    id: ENTITY_TYPES.APP_AUTHORIZATION as EntityType,
    label: 'App Authorization',
    description: 'Investigation based on application authorization',
    category: EntityCategory.APPLICATION,
    icon: 'lock-closed',
    placeholder: 'Enter authorization ID',
    examples: ['auth_12345', 'oauth_auth_abc'],
    priority: 64,
  },
};

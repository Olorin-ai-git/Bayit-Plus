/**
 * Olorin Unified Icon System
 *
 * This package provides a centralized icon registry and utilities for all platforms:
 * - Web: React with lucide-react
 * - Mobile: React Native
 * - TV: React Native with large icons
 *
 * Usage:
 *
 * Web:
 *   import { Icon, useIcon, ICON_REGISTRY } from '@olorin/shared-icons/web';
 *
 * Native (Mobile/TV):
 *   import { useIcon, ICON_REGISTRY } from '@olorin/shared-icons/native';
 *
 * Registry Only:
 *   import { ICON_REGISTRY, getIcon, getIconSize } from '@olorin/shared-icons';
 */

export * from './registry/iconRegistry';

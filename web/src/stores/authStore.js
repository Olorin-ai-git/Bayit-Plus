/**
 * Web Auth Store - Re-exports from shared unified auth store
 * This file exists for backwards compatibility with existing imports.
 * All auth state is managed by the shared authStore for single source of truth.
 */

export { useAuthStore } from '@bayit/shared-stores/authStore';

/**
 * Web App UI Components
 * Re-exports shared components for backward compatibility
 */

// Re-export all shared Glass components
export {
  GlassView,
  GlassCard,
  GlassButton,
  GlassInput,
  GlassSelect,
  GlassTextarea,
  GlassCheckbox,
  GlassModal,
  GlassBadge,
  GlassTabs,
} from '@bayit/shared/ui';

// Re-export types
export type { GlassModalProps, ModalType, ModalButton } from '@bayit/shared/ui';

// Keep AnimatedLogo locally (web-specific)
export { default as AnimatedLogo } from './AnimatedLogo';

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
  AnimatedLogo,
  DemoBanner,
} from '@bayit/shared';

// Re-export types
export type { GlassModalProps, ModalType, ModalButton } from '@bayit/shared/ui';

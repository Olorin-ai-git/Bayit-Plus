// Bayit+ Shared Glass UI Components
// Platform-agnostic components - safe for all platforms (web, TV, mobile)

// Core glass components
export { GlassView } from './GlassView';
export { GlassCard } from './GlassCard';
export { GlassButton } from './GlassButton';
export { GlassFAB } from './GlassFAB';

// Form components
export { GlassInput } from './GlassInput';
export { GlassSelect } from './GlassSelect';
export { GlassTextarea } from './GlassTextarea';
export { GlassCheckbox } from './GlassCheckbox';
export { GlassToggle } from './GlassToggle';
export { TVSwitch } from './TVSwitch';

// UI components
export { GlassModal } from './GlassModal';
export { GlassBadge } from './GlassBadge';
export { GlassTabs } from './GlassTabs';
export { GlassCategoryPill } from './GlassCategoryPill';
export { GlassBreadcrumbs } from './GlassBreadcrumbs';
export { AnalogClock } from './AnalogClock';
export { GlassAvatar } from './GlassAvatar';
export { GlassStatCard } from './GlassStatCard';
export { GlassLiveChannelCard } from './GlassLiveChannelCard';
export { GlassResizablePanel } from './GlassResizablePanel';
export { GlassSplitterHandle } from './GlassSplitterHandle';
export { GlassTooltip } from './GlassTooltip';

// Voice-first conversational interface components (Phases 10)
export { GlassParticleLayer } from './GlassParticleLayer';

// Types
export type { GlassModalProps, ModalType, ModalButton } from './GlassModal';
export type { AnalogClockProps } from './AnalogClock';
export type { GlassAvatarProps } from './GlassAvatar';
export type { GlassToggleProps } from './GlassToggle';
export type { GlassStatCardProps } from './GlassStatCard';

// Web-only components (depend on lucide-react) are in a separate export
// Import from '@bayit/shared/ui/web' for web-only usage:
// GlassTable, GlassTableCell, GlassLog, GlassDraggableExpander

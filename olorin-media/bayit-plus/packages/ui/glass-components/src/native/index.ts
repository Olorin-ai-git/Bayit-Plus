/**
 * Olorin Glass UI - React Native Components
 *
 * Glass UI component library for React Native platforms:
 * - iOS
 * - Android
 * - tvOS
 * - Android TV
 *
 * Usage:
 * ```tsx
 * import { GlassView, GlassButton, GlassCard } from '@olorin/glass-ui';
 * // or
 * import { GlassView, GlassButton, GlassCard } from '@olorin/glass-ui/native';
 * ```
 */

// Core container component
export { GlassView, type GlassViewProps } from './components/GlassView';

// Interactive components
export { GlassButton, type GlassButtonProps, type ButtonVariant, type ButtonSize } from './components/GlassButton';
export { GlassFAB, type GlassFABProps, type FABSize, type FABVariant } from './components/GlassFAB';
export { GlassCheckbox, type GlassCheckboxProps } from './components/GlassCheckbox';
export { GlassToggle, type GlassToggleProps } from './components/GlassToggle';
export { GlassChevron, type GlassChevronProps, type ChevronSize } from './components/GlassChevron';

// Form components
export { GlassInput, type GlassInputProps } from './components/GlassInput';
export { GlassTextarea, type GlassTextareaProps } from './components/GlassTextarea';
export { GlassSelect, type GlassSelectProps, type SelectOption } from './components/GlassSelect';

// Content components
export { GlassCard, type GlassCardProps } from './components/GlassCard';
export { GlassAvatar, type GlassAvatarProps } from './components/GlassAvatar';
export { GlassStatCard, type GlassStatCardProps } from './components/GlassStatCard';
export { GlassBadge, type GlassBadgeProps, type BadgeVariant, type BadgeSize } from './components/GlassBadge';

// Navigation components
export { GlassTabs, type GlassTabsProps, type Tab as GlassTabItem, type TabVariant } from './components/GlassTabs';

// Feedback components
export { GlassModal, type GlassModalProps, type ModalType } from './components/GlassModal';
export { GlassTooltip, type GlassTooltipProps } from './components/GlassTooltip';
export { GlassProgressBar, type GlassProgressBarProps, type ProgressSize, type ProgressVariant } from './components/GlassProgressBar';

// Notification components
export { GlassToast, default as GlassToastComponent } from './components/GlassToast';
export { GlassToastContainer, default as GlassToastContainerComponent } from './components/GlassToastContainer';
export {
  type NotificationLevel,
  type NotificationPosition,
  type NotificationAction,
  type Notification,
  type NotificationOptions,
  type I18nNotificationOptions,
  type GlassToastProps,
  type GlassToastContainerProps,
} from './components/GlassToast/types';

// Navigation components (additional)
export { GlassBreadcrumbs, type GlassBreadcrumbsProps, type BreadcrumbItem } from './components/GlassBreadcrumbs';

// Category/Filter components
export { GlassCategoryPill, type GlassCategoryPillProps } from './components/GlassCategoryPill';

// Layout components
export { GlassSplitterHandle, type GlassSplitterHandleProps } from './components/GlassSplitterHandle';
export { GlassResizablePanel, type GlassResizablePanelProps } from './components/GlassResizablePanel';
export { GlassDraggableExpander, type GlassDraggableExpanderProps } from './components/GlassDraggableExpander';

// List components
export { GlassReorderableList, type GlassReorderableListProps } from './components/GlassReorderableList';
export { GlassSectionItem, type GlassSectionItemProps } from './components/GlassSectionItem';

// Card components (additional)
export { GlassLiveChannelCard, type GlassLiveChannelCardProps, type LiveChannelData } from './components/GlassLiveChannelCard';

// Table components
export { GlassTable, GlassTableCell, type GlassTableProps, type GlassTableColumn, type GlassTablePagination } from './components/GlassTable';

// Specialized components
export { GlassAnalogClock, type GlassAnalogClockProps } from './components/GlassAnalogClock';
export { GlassTVSwitch, type GlassTVSwitchProps } from './components/GlassTVSwitch';

// Re-export hooks
export * from '../hooks/index';

// Re-export theme
export * from '../theme';

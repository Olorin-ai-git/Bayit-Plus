/**
 * @olorin/shared-hooks
 *
 * Cross-platform React hooks for the Olorin.ai ecosystem.
 * Provides platform detection, layout management, and direction utilities.
 */

// Platform detection
export {
  usePlatform,
  usePlatformValue,
  type PlatformInfo,
} from './usePlatform';

// Device layout and responsive design
export {
  useDeviceLayout,
  useResponsiveValue,
  getLayoutStyles,
  LayoutMode,
  type LayoutState,
  type LayoutStyles,
} from './useDeviceLayout';

// RTL/LTR direction support
export {
  useDirection,
  type DirectionResult,
} from './useDirection';

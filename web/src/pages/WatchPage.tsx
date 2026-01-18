/**
 * WatchPage - Backward Compatibility Re-export
 *
 * This file maintains backward compatibility by re-exporting the refactored
 * WatchPage component from the modular ./watch directory structure.
 *
 * The original 974-line file has been refactored into:
 * - watch/WatchPage.tsx (main orchestrator, ~250 lines)
 * - watch/components/* (8 components for UI sections)
 * - watch/hooks/* (4 custom hooks for state management)
 * - watch/types/* (shared TypeScript interfaces)
 *
 * @see /web/src/pages/watch/WatchPage.tsx for the main implementation
 */

export { WatchPage as default } from './watch';

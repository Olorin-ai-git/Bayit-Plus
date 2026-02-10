/**
 * Module declarations for packages without TypeScript type definitions.
 * Provides type stubs so TypeScript can resolve these imports.
 */

// ─── @olorin/glass-ui (dist has no .d.ts) ─────────────────

declare module '@olorin/glass-ui' {
  import type { ComponentType, ReactNode } from 'react';

  type AnyProps = Record<string, any>;
  type GlassComponent<P = AnyProps> = ComponentType<P & { children?: ReactNode; style?: any; className?: string; testID?: string; [key: string]: any }>;

  // Core
  export const GlassView: GlassComponent;
  export interface GlassViewProps extends AnyProps { children?: ReactNode; style?: any; className?: string }

  // Interactive
  export const GlassButton: GlassComponent;
  export interface GlassButtonProps extends AnyProps { children?: ReactNode; onPress?: (...args: any[]) => void; variant?: string; size?: string; disabled?: boolean }
  export type ButtonVariant = string;
  export type ButtonSize = string;

  export const GlassFAB: GlassComponent;
  export interface GlassFABProps extends AnyProps {}
  export type FABSize = string;
  export type FABVariant = string;

  export const GlassCheckbox: GlassComponent;
  export interface GlassCheckboxProps extends AnyProps {}

  export const GlassToggle: GlassComponent;
  export interface GlassToggleProps extends AnyProps {}

  export const GlassChevron: GlassComponent;
  export interface GlassChevronProps extends AnyProps {}
  export type ChevronSize = string;

  // Form
  export const GlassInput: GlassComponent;
  export interface GlassInputProps extends AnyProps {}

  export const GlassTextarea: GlassComponent;
  export interface GlassTextareaProps extends AnyProps {}

  export const GlassSelect: GlassComponent;
  export interface GlassSelectProps extends AnyProps {}
  export interface SelectOption { label: string; value: string | number; [key: string]: any }

  // Content
  export const GlassCard: GlassComponent;
  export interface GlassCardProps extends AnyProps {}

  export const GlassAvatar: GlassComponent;
  export interface GlassAvatarProps extends AnyProps {}

  export const GlassStatCard: GlassComponent;
  export interface GlassStatCardProps extends AnyProps {}

  export const GlassBadge: GlassComponent;
  export interface GlassBadgeProps extends AnyProps {}
  export type BadgeVariant = string;
  export type BadgeSize = string;

  export const GlassPlaceholder: GlassComponent;
  export interface GlassPlaceholderProps extends AnyProps {}

  // Navigation
  export const GlassTabs: GlassComponent;
  export interface GlassTabsProps extends AnyProps {}
  export interface GlassTabItem { key: string; label: string; [key: string]: any }
  export type TabVariant = string;

  export const GlassTabContainer: GlassComponent;
  export interface GlassTabContainerProps extends AnyProps {}
  export interface TabContent { key: string; content: ReactNode; [key: string]: any }

  // Feedback
  export const GlassModal: GlassComponent;
  export interface GlassModalProps extends AnyProps { visible?: boolean; onClose?: () => void; onRequestClose?: () => void; animationType?: string }
  export type ModalType = string;
  export type ModalSize = string;
  export interface ModalButton { text: string; onPress?: () => void; variant?: string; [key: string]: any }

  export const GlassLocationConsentModal: GlassComponent;
  export interface GlassLocationConsentModalProps extends AnyProps {}

  export const GlassTooltip: GlassComponent;
  export interface GlassTooltipProps extends AnyProps {}

  export const GlassProgressBar: GlassComponent;
  export interface GlassProgressBarProps extends AnyProps {}
  export type ProgressSize = string;
  export type ProgressVariant = string;

  export const GlassErrorBanner: GlassComponent;
  export interface GlassErrorBannerProps extends AnyProps {}

  export const GlassEmptyState: GlassComponent;
  export interface GlassEmptyStateProps extends AnyProps {}
  export type EmptyStateVariant = string;
  export type EmptyStateSize = string;
  export type ContentType = string;
  export interface EmptyStateAction { label: string; onPress: () => void; [key: string]: any }

  // Notification
  export const GlassToast: GlassComponent;
  export const GlassToastComponent: GlassComponent;
  export const GlassToastContainer: GlassComponent;
  export const GlassToastContainerComponent: GlassComponent;

  export type NotificationLevel = 'info' | 'success' | 'warning' | 'error' | string;
  export type NotificationPosition = string;
  export interface NotificationAction { label: string; onPress: () => void; type?: string; [key: string]: any }
  export interface Notification { id: string; level: NotificationLevel; message: string; title?: string; action?: NotificationAction; [key: string]: any }
  export interface NotificationOptions extends AnyProps {}
  export interface I18nNotificationOptions extends AnyProps {}
  export interface GlassToastProps extends AnyProps {}
  export interface GlassToastContainerProps extends AnyProps {}

  // Breadcrumbs
  export const GlassBreadcrumbs: GlassComponent;
  export interface GlassBreadcrumbsProps extends AnyProps {}
  export interface BreadcrumbItem { label: string; href?: string; onPress?: () => void; [key: string]: any }

  // Category
  export const GlassCategoryPill: GlassComponent;
  export interface GlassCategoryPillProps extends AnyProps {}

  // Layout
  export const GlassSplitterHandle: GlassComponent;
  export interface GlassSplitterHandleProps extends AnyProps {}

  export const GlassResizablePanel: GlassComponent;
  export interface GlassResizablePanelProps extends AnyProps {}

  export const GlassDraggableExpander: GlassComponent;
  export interface GlassDraggableExpanderProps extends AnyProps {}

  // List
  export const GlassReorderableList: GlassComponent;
  export interface GlassReorderableListProps extends AnyProps {}

  export const GlassSectionItem: GlassComponent;
  export interface GlassSectionItemProps extends AnyProps {}

  // Cards
  export const GlassLiveChannelCard: GlassComponent;
  export interface GlassLiveChannelCardProps extends AnyProps {}
  export interface LiveChannelData extends AnyProps {}

  // Table
  export const GlassTable: GlassComponent;
  export const GlassTableCell: GlassComponent;
  export interface GlassTableProps extends AnyProps {}
  export interface GlassTableColumn extends AnyProps { key: string; header: string }
  export interface GlassTablePagination extends AnyProps {}

  // Specialized
  export const GlassAnalogClock: GlassComponent;
  export interface GlassAnalogClockProps extends AnyProps {}

  export const GlassTVSwitch: GlassComponent;
  export interface GlassTVSwitchProps extends AnyProps {}

  // Carousel
  export const GlassCarousel3D: GlassComponent;
  export interface GlassCarousel3DProps extends AnyProps {}

  export const GlassPosterCard: GlassComponent;
  export interface GlassPosterCardProps extends AnyProps {}

  // Visualization
  export const GlassRadar: GlassComponent;
  export interface GlassRadarProps extends AnyProps {}
  export interface RadarAgent extends AnyProps {}
  export interface RadarAnomaly extends AnyProps {}
  export interface RadarUIState extends AnyProps {}

  export const GlassGauge: GlassComponent;
  export interface GlassGaugeProps extends AnyProps {}
  export interface RiskZone extends AnyProps {}

  export const GlassHeartbeat: GlassComponent;
  export interface GlassHeartbeatProps extends AnyProps {}
  export type HeartbeatStatus = string;
  export type HeartbeatSize = string;

  // Hooks
  export function useGlassTheme(): any;
  export function useNotifications(): any;
  export function useGlassAnimation(config?: any): any;
  export function useGlassAccessibility(options?: any): any;

  // Notification Provider
  export const NotificationProvider: GlassComponent;
  export interface NotificationProviderProps extends AnyProps { children?: ReactNode }

  // Theme
  export const glassTheme: any;
  export const glassDark: any;
  export const glassLight: any;
}

declare module '@olorin/glass-ui/web' {
  export * from '@olorin/glass-ui';
}

declare module '@olorin/glass-ui/native' {
  export * from '@olorin/glass-ui';
}

declare module 'react-native-web-linear-gradient' {
  import type { ComponentType, ReactNode } from 'react';
  const LinearGradient: ComponentType<{
    colors: string[];
    start?: { x: number; y: number };
    end?: { x: number; y: number };
    locations?: number[];
    style?: any;
    children?: ReactNode;
    [key: string]: any;
  }>;
  export default LinearGradient;
}

// ─── Third-party packages ─────────────────────────────────

declare module '@growthbook/growthbook-react' {
  import type { ComponentType, ReactNode } from 'react';

  export interface GrowthBookContextValue {
    growthbook: GrowthBook | null;
  }

  export interface FeatureResult<T = unknown> {
    value: T;
    on: boolean;
    off: boolean;
    source: string;
  }

  export class GrowthBook {
    constructor(options?: Record<string, unknown>);
    setAttributes(attrs: Record<string, unknown>): void;
    setFeatures(features: Record<string, unknown>): void;
    getFeatureValue<T = unknown>(key: string, defaultValue: T): T;
    isOn(key: string): boolean;
    isOff(key: string): boolean;
    feature<T = unknown>(key: string): FeatureResult<T>;
    destroy(): void;
    loadFeatures(options?: Record<string, unknown>): Promise<void>;
  }

  export const GrowthBookProvider: ComponentType<{
    growthbook: GrowthBook;
    children: ReactNode;
  }>;

  export function useGrowthBook(): GrowthBook | null;
  export function useFeature<T = unknown>(key: string): FeatureResult<T>;
  export function useFeatureValue<T = unknown>(key: string, defaultValue: T): T;
  export function useFeatureIsOn(key: string): boolean;

  export const IfFeatureEnabled: ComponentType<{
    feature: string;
    children: ReactNode;
  }>;

  export const FeatureString: ComponentType<{
    feature: string;
    default?: string;
  }>;
}

declare module '@sentry/react' {
  import type { ComponentType, ReactNode } from 'react';

  export function init(options: Record<string, unknown>): void;
  export function captureException(error: unknown, context?: Record<string, unknown>): string;
  export function captureMessage(message: string, level?: string): string;
  export function setUser(user: Record<string, unknown> | null): void;
  export function setTag(key: string, value: string): void;
  export function setContext(name: string, context: Record<string, unknown> | null): void;
  export function addBreadcrumb(breadcrumb: Record<string, unknown>): void;
  export function withScope(callback: (scope: unknown) => void): void;
  export function startTransaction(context: Record<string, unknown>): unknown;

  export const ErrorBoundary: ComponentType<{
    fallback?: ReactNode | ComponentType<{ error: Error; resetError: () => void }>;
    showDialog?: boolean;
    children?: ReactNode;
    onError?: (error: Error, componentStack: string) => void;
    onReset?: () => void;
  }>;

  export function withProfiler<P>(component: ComponentType<P>, options?: Record<string, unknown>): ComponentType<P>;
  export function withErrorBoundary<P>(component: ComponentType<P>, options?: Record<string, unknown>): ComponentType<P>;

  export const BrowserTracing: new (options?: Record<string, unknown>) => unknown;

  export function createBrowserRouter(routes: unknown[], options?: Record<string, unknown>): unknown;
  export function wrapCreateBrowserRouter(createRouter: unknown): unknown;
}

declare module 'expo-file-system' {
  export const documentDirectory: string | null;
  export const cacheDirectory: string | null;

  export function getInfoAsync(fileUri: string, options?: Record<string, unknown>): Promise<{
    exists: boolean;
    uri: string;
    size: number;
    isDirectory: boolean;
    modificationTime: number;
  }>;

  export function readAsStringAsync(fileUri: string, options?: Record<string, unknown>): Promise<string>;
  export function writeAsStringAsync(fileUri: string, contents: string, options?: Record<string, unknown>): Promise<void>;
  export function deleteAsync(fileUri: string, options?: Record<string, unknown>): Promise<void>;
  export function moveAsync(options: { from: string; to: string }): Promise<void>;
  export function copyAsync(options: { from: string; to: string }): Promise<void>;
  export function makeDirectoryAsync(fileUri: string, options?: Record<string, unknown>): Promise<void>;
  export function readDirectoryAsync(fileUri: string): Promise<string[]>;

  export function downloadAsync(
    uri: string,
    fileUri: string,
    options?: Record<string, unknown>
  ): Promise<{ uri: string; status: number; headers: Record<string, string>; md5?: string }>;
}

declare module '@react-native-community/netinfo' {
  export interface NetInfoState {
    type: string;
    isConnected: boolean | null;
    isInternetReachable: boolean | null;
    details: unknown;
  }

  export function fetch(): Promise<NetInfoState>;
  export function addEventListener(listener: (state: NetInfoState) => void): () => void;
  export function useNetInfo(): NetInfoState;

  const NetInfo: {
    fetch: typeof fetch;
    addEventListener: typeof addEventListener;
    useNetInfo: typeof useNetInfo;
  };

  export default NetInfo;
}

// ─── Missing local modules ────────────────────────────────

declare module '@/types/watchparty' {
  export interface WatchParty {
    id: string;
    hostId: string;
    contentId: string;
    participants: string[];
    status: 'waiting' | 'playing' | 'paused' | 'ended';
    createdAt: string;
    [key: string]: unknown;
  }

  export interface WatchPartyMessage {
    type: string;
    userId: string;
    content: string;
    timestamp: number;
    [key: string]: unknown;
  }
}

declare module '@/types/media' {
  export interface MediaItem {
    id: string;
    title: string;
    type: 'movie' | 'series' | 'episode' | 'live' | 'radio' | 'podcast';
    thumbnailUrl?: string;
    duration?: number;
    [key: string]: unknown;
  }

  export interface MediaPlaybackState {
    currentTime: number;
    duration: number;
    isPlaying: boolean;
    volume: number;
    [key: string]: unknown;
  }
}

declare module '@/types/quota' {
  export interface QuotaInfo {
    used: number;
    limit: number;
    remaining: number;
    resetDate?: string;
    [key: string]: unknown;
  }

  export interface QuotaUsage {
    feature: string;
    count: number;
    lastUsed?: string;
    [key: string]: unknown;
  }
}

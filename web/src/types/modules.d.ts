/**
 * Module declarations for packages without TypeScript type definitions.
 * Provides type stubs so TypeScript can resolve these imports.
 */

// ─── Global type augmentations ───────────────────────────

/**
 * setTimeout returns number in browser but NodeJS.Timeout in Node types.
 * Use this alias for cross-environment compatibility.
 */
declare type Timeout = ReturnType<typeof setTimeout>;

/** Platform flag for tvOS builds */
declare const __TV__: boolean | undefined;

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
  export function useExperiment<T = unknown>(experiment: Record<string, unknown>): { value: T; variationId: number; inExperiment: boolean };

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

  export interface WatchPartyParticipant {
    id: string;
    userId: string;
    name: string;
    avatar?: string;
    isHost?: boolean;
    joinedAt?: string;
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

  export interface Chapter {
    id: string;
    title: string;
    startTime: number;
    endTime?: number;
    thumbnail?: string;
    [key: string]: unknown;
  }
}

// ─── react-native-linear-gradient ─────────────────────────

declare module 'react-native-linear-gradient' {
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

// ─── @olorin/glass-ui hooks sub-paths ─────────────────────

declare module '@olorin/glass-ui/hooks' {
  export function useGlassTheme(): any;
  export function useNotifications(): any;
  export function useGlassAnimation(config?: any): any;
  export function useGlassAccessibility(options?: any): any;
}

// ─── @olorin/shared-icons ──────────────────────────────────

declare module '@olorin/shared-icons' {
  export type GlassLevel = 'subtle' | 'low' | 'medium' | 'high' | string;
  export const NativeIcon: any;
  export const WebIcon: any;
  export const Icon: any;
  export default any;
}

declare module '@olorin/shared-icons/native' {
  import type { ComponentType } from 'react';
  export type IconName = string;
  export type IconSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | number;
  export const NativeIcon: ComponentType<{
    name: string;
    size?: IconSize;
    color?: string;
    style?: any;
    context?: string;
    [key: string]: any;
  }>;
  export default NativeIcon;
}

declare module '@olorin/shared-icons/web' {
  import type { ComponentType } from 'react';
  export type IconName = string;
  export type IconSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | number;
  export const Icon: ComponentType<{
    name: string;
    size?: IconSize;
    color?: string;
    style?: any;
    className?: string;
    context?: string;
    [key: string]: any;
  }>;
  export const WebIcon: ComponentType<{
    name: string;
    size?: IconSize;
    color?: string;
    style?: any;
    className?: string;
    context?: string;
    [key: string]: any;
  }>;
  export function renderIcon(name: string, size?: string, context?: string, className?: string, options?: Record<string, any>): any;
  export default WebIcon;
}

// ─── @bayit/shared/ui ──────────────────────────────────────

declare module '@bayit/shared/ui' {
  import type { ComponentType, ReactNode } from 'react';
  export const GlassLoadingSpinner: ComponentType<{
    size?: 'small' | 'large' | string;
    color?: string;
    [key: string]: any;
  }>;
  export const GlassView: ComponentType<any>;
  export const GlassButton: ComponentType<any>;
  export const GlassCard: ComponentType<any>;
  export const GlassModal: ComponentType<any>;
  export const GlassInput: ComponentType<any>;
  export const GlassSelect: ComponentType<any>;
  export const GlassCheckbox: ComponentType<any>;
  export const GlassStatCard: ComponentType<any>;
  export const GlassPageHeader: ComponentType<any>;
  export const GlassProgressBar: ComponentType<any>;
  export const GlassEmptyState: ComponentType<any>;
  export const GlassErrorBanner: ComponentType<any>;
  export const GlassBadge: ComponentType<any>;
  export const GlassTooltip: ComponentType<any>;
  export const GlassToggle: ComponentType<any>;
  export const GlassTabs: ComponentType<any>;
  export const GlassAvatar: ComponentType<any>;
  export const GlassPlaceholder: ComponentType<any>;
  export const GlassTextarea: ComponentType<any>;
  export const GlassBreadcrumbs: ComponentType<any>;
  export const GlassFAB: ComponentType<any>;
  export const GlassChevron: ComponentType<any>;
  export const GlassReorderableList: ComponentType<any>;
  export const GlassSectionItem: ComponentType<any>;
  export const GlassTable: ComponentType<any>;
  export const GlassTableCell: ComponentType<any>;
  export const GlassCategoryPill: ComponentType<any>;
  export const GlassResizablePanel: ComponentType<any>;
  export const GlassDraggableExpander: ComponentType<any>;
  export const GlassSplitterHandle: ComponentType<any>;
  export const GlassLiveChannelCard: ComponentType<any>;
  export const GlassAnalogClock: ComponentType<any>;
  export const GlassTVSwitch: ComponentType<any>;
  export const GlassCarousel3D: ComponentType<any>;
  export const GlassPosterCard: ComponentType<any>;
  export const GlassRadar: ComponentType<any>;
  export const GlassGauge: ComponentType<any>;
  export const GlassHeartbeat: ComponentType<any>;
  export const GlassTabContainer: ComponentType<any>;
  export const GlassLocationConsentModal: ComponentType<any>;
  export const GlassToast: ComponentType<any>;
  export const GlassToastContainer: ComponentType<any>;
  export const NotificationProvider: ComponentType<any>;
  export const GlassParticleLayer: ComponentType<any>;
  export const GlassAlertRoot: ComponentType<any>;
  export const GlassHierarchicalTable: ComponentType<any>;
  export const GlassPlaylist: ComponentType<any>;
  export const GlassSlider: ComponentType<any>;
  export const GridSkeleton: ComponentType<any>;
  export const HeroCarouselSkeleton: ComponentType<any>;
  export const RowSkeleton: ComponentType<any>;
  export const PodcastPlaceholder: ComponentType<any>;
  export const RadioPlaceholder: ComponentType<any>;
  export const ThumbnailCell: ComponentType<any>;
  export const TitleCell: ComponentType<any>;
  export const TextCell: ComponentType<any>;
  export const ActionsCell: ComponentType<any>;
  export function createStarAction(onPress: () => void, filled?: boolean, tooltip?: string): any;
  export function createViewAction(onPress: () => void, tooltip?: string): any;
  export function createEditAction(onPress: () => void, tooltip?: string): any;
  export function createDeleteAction(onPress: () => void, tooltip?: string): any;
  export function useGlassAlert(): any;
  export interface HierarchicalTableColumn { key: string; header?: string; label?: string; [key: string]: any }
  export interface HierarchicalTableRow { id: string; [key: string]: any }
  export type ModalType = string;
  export interface ModalButton { text: string; onPress?: () => void; variant?: string; [key: string]: any }
  export interface TabContent { key: string; content: ReactNode; [key: string]: any }
  export const GlassContentPlaceholder: ComponentType<any>;
  export interface GlassModalProps { visible?: boolean; onClose?: () => void; onRequestClose?: () => void; animationType?: string; size?: string; className?: string; testID?: string; children?: ReactNode; [key: string]: any }
}

// ─── react-error-boundary ──────────────────────────────────

declare module 'react-error-boundary' {
  import type { ComponentType, ReactNode } from 'react';
  export const ErrorBoundary: ComponentType<{
    FallbackComponent?: ComponentType<any>;
    fallback?: ReactNode;
    onError?: (error: Error, info: any) => void;
    onReset?: () => void;
    children?: ReactNode;
    [key: string]: any;
  }>;
}

// ─── @testing-library/react-native ─────────────────────────

declare module '@testing-library/react-native' {
  export function render(component: any, options?: any): any;
  export const fireEvent: {
    press: (element: any) => void;
    changeText: (element: any, text: string) => void;
    scroll: (element: any, data: any) => void;
    [key: string]: any;
  };
  export function waitFor(callback: () => any, options?: any): Promise<any>;
  export function act(callback: () => any): Promise<void>;
  export const screen: any;
}

// ─── @/types/quota ─────────────────────────────────────────

declare module '@olorin/design-tokens' {
  export const colors: any;
  export const typography: any;
  export const spacing: any;
  export const shadows: any;
  export const borderRadius: any;
  export const fontSize: any;
  export const fontWeight: any;
  export const lineHeight: any;
  export const letterSpacing: any;
  export const breakpoints: any;
  export const zIndex: any;
  export const opacity: any;
  export const animation: any;
  export const transitions: any;
  export type ContentType = 'movie' | 'series' | 'episode' | 'live' | 'radio' | 'podcast' | 'audiobook' | string;
  export const glass: Record<string, any>;
  export const quizAnswerColors: Record<string, any>;
  export const shadowRN: Record<string, any>;
  export const fontSizeTV: Record<string, any>;
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

  export interface UsageStat {
    feature: string;
    count: number;
    limit: number;
    period: string;
    [key: string]: unknown;
  }
}

// ─── React Native community packages ───────────────────────

declare module '@react-native-community/slider' {
  import type { ComponentType } from 'react';
  const Slider: ComponentType<{
    value?: number;
    minimumValue?: number;
    maximumValue?: number;
    step?: number;
    onValueChange?: (value: number) => void;
    onSlidingComplete?: (value: number) => void;
    minimumTrackTintColor?: string;
    maximumTrackTintColor?: string;
    thumbTintColor?: string;
    disabled?: boolean;
    style?: any;
    [key: string]: any;
  }>;
  export default Slider;
}

declare module '@react-native-picker/picker' {
  import type { ComponentType, ReactNode } from 'react';
  export const Picker: ComponentType<{
    selectedValue?: any;
    onValueChange?: (value: any, index: number) => void;
    enabled?: boolean;
    style?: any;
    children?: ReactNode;
    [key: string]: any;
  }> & {
    Item: ComponentType<{
      label: string;
      value: any;
      color?: string;
      [key: string]: any;
    }>;
  };
}

declare module 'luxon' {
  export class DateTime {
    static now(): DateTime;
    static local(...args: number[]): DateTime;
    static fromISO(text: string, opts?: Record<string, any>): DateTime;
    static fromJSDate(date: Date, options?: Record<string, any>): DateTime;
    static fromMillis(ms: number, options?: Record<string, any>): DateTime;
    static fromSeconds(seconds: number, options?: Record<string, any>): DateTime;
    static fromFormat(text: string, fmt: string, opts?: Record<string, any>): DateTime;
    static fromObject(obj: Record<string, any>, opts?: Record<string, any>): DateTime;
    toISO(): string | null;
    toISODate(): string | null;
    toISOTime(opts?: Record<string, any>): string | null;
    toFormat(fmt: string, opts?: Record<string, any>): string;
    toLocaleString(formatOpts?: Record<string, any>, opts?: Record<string, any>): string;
    toJSDate(): Date;
    toMillis(): number;
    toSeconds(): number;
    plus(duration: Record<string, number>): DateTime;
    minus(duration: Record<string, number>): DateTime;
    startOf(unit: string): DateTime;
    endOf(unit: string): DateTime;
    set(values: Record<string, number>): DateTime;
    diff(other: DateTime, unit?: string | string[], opts?: Record<string, any>): Duration;
    diffNow(unit?: string | string[], opts?: Record<string, any>): Duration;
    hasSame(other: DateTime, unit: string): boolean;
    setZone(zone: string, opts?: Record<string, any>): DateTime;
    setLocale(locale: string): DateTime;
    get hour(): number;
    get minute(): number;
    get second(): number;
    get year(): number;
    get month(): number;
    get day(): number;
    get weekday(): number;
    get isValid(): boolean;
    get invalidReason(): string | null;
    get ts(): number;
    get zone(): any;
    get zoneName(): string;
    get offset(): number;
    valueOf(): number;
    equals(other: DateTime): boolean;
    [key: string]: any;
  }
  export class Duration {
    static fromISO(text: string): Duration;
    static fromMillis(ms: number): Duration;
    static fromObject(obj: Record<string, number>): Duration;
    toMillis(): number;
    toObject(): Record<string, number>;
    toFormat(fmt: string): string;
    as(unit: string): number;
    get(unit: string): number;
    [key: string]: any;
  }
  export class Interval {
    static fromDateTimes(start: DateTime, end: DateTime): Interval;
    static fromISO(text: string): Interval;
    static after(start: DateTime, duration: Record<string, number>): Interval;
    get start(): DateTime;
    get end(): DateTime;
    length(unit?: string): number;
    contains(dateTime: DateTime): boolean;
    splitBy(duration: Record<string, number>): Interval[];
    [key: string]: any;
  }
  export class Settings {
    static defaultZone: string;
    static defaultLocale: string;
    static throwOnInvalid: boolean;
  }
}

declare module 'expo-haptics' {
  export enum ImpactFeedbackStyle {
    Light = 'light',
    Medium = 'medium',
    Heavy = 'heavy',
  }
  export enum NotificationFeedbackType {
    Success = 'success',
    Warning = 'warning',
    Error = 'error',
  }
  export function impactAsync(style?: ImpactFeedbackStyle): Promise<void>;
  export function notificationAsync(type?: NotificationFeedbackType): Promise<void>;
  export function selectionAsync(): Promise<void>;
}

// ─── @sentry/react ──────────────────────────────────────
declare module '@sentry/react' {
  export type SeverityLevel = 'fatal' | 'error' | 'warning' | 'log' | 'info' | 'debug';

  export interface ScopeContext {
    extra?: Record<string, unknown>;
    tags?: Record<string, string>;
    level?: SeverityLevel;
    [key: string]: any;
  }

  export function init(options: Record<string, any>): void;
  export function captureException(error: any, context?: Partial<ScopeContext>): string;
  export function captureMessage(message: string, levelOrContext?: SeverityLevel | Partial<ScopeContext>): string;
  export function setTag(key: string, value: string): void;
  export function setUser(user: Record<string, any> | null): void;
  export function setExtra(key: string, value: any): void;
  export function withScope(callback: (scope: any) => void): void;
  export function configureScope(callback: (scope: any) => void): void;
  export function browserTracingIntegration(options?: Record<string, any>): any;
  export function replayIntegration(options?: Record<string, any>): any;
  export function ErrorBoundary(props: any): any;

  const Sentry: {
    init: typeof init;
    captureException: typeof captureException;
    captureMessage: typeof captureMessage;
    setTag: typeof setTag;
    setUser: typeof setUser;
    setExtra: typeof setExtra;
    withScope: typeof withScope;
    configureScope: typeof configureScope;
    browserTracingIntegration: typeof browserTracingIntegration;
    replayIntegration: typeof replayIntegration;
    ErrorBoundary: typeof ErrorBoundary;
    SeverityLevel: SeverityLevel;
    [key: string]: any;
  };
  export default Sentry;
}

// ─── @bayit/shared-types ─────────────────────────────────
declare module '@bayit/shared-types/voiceModes' {
  export const VoiceMode: {
    VOICE_ONLY: string;
    HYBRID: string;
    CLASSIC: string;
    [key: string]: string;
  };
  export type VoiceMode = string;
  export const VOICE_MODES: Record<string, VoiceMode>;
  export interface ModeConfig {
    [key: string]: any;
  }
}

// ─── @bayit/shared-utils/logger ──────────────────────────
declare module '@bayit/shared-utils/logger' {
  export interface SentryIntegration {
    captureException: (error: any, options?: { extra?: Record<string, unknown> }) => void;
    captureMessage: (message: string, options?: { level?: string; extra?: Record<string, unknown> }) => void;
    setTag: (key: string, value: string) => void;
  }
  export function initLoggerSentry(integration: SentryIntegration): void;

  interface Logger {
    debug(message: string, ...args: any[]): void;
    info(message: string, ...args: any[]): void;
    warn(message: string, ...args: any[]): void;
    error(message: string, ...args: any[]): void;
  }
  const logger: Logger;
  export default logger;
}

// ─── @bayit/shared/components/ErrorBoundary ──────────────
declare module '@bayit/shared/components/ErrorBoundary' {
  export interface ErrorBoundarySentry {
    captureException: (error: any, options?: { extra?: Record<string, unknown> }) => void;
  }
  export function initErrorBoundarySentry(integration: ErrorBoundarySentry): void;
}

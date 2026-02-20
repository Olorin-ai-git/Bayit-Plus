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

  export interface ScopedLogger {
    debug(message: string, data?: unknown): void;
    info(message: string, data?: unknown): void;
    warn(message: string, data?: unknown): void;
    error(message: string, error?: unknown): void;
  }

  export interface Logger {
    debug(message: string, ...args: any[]): void;
    info(message: string, ...args: any[]): void;
    warn(message: string, ...args: any[]): void;
    error(message: string, ...args: any[]): void;
    scope(context: string): ScopedLogger;
  }
  export const logger: Logger;
  export default logger;
}

// ─── @bayit/glass ────────────────────────────────────────
declare module '@bayit/glass' {
  import type { ComponentType, ReactNode } from 'react';

  type AnyProps = Record<string, any>;
  type GlassComponent<P = AnyProps> = ComponentType<P & { children?: ReactNode; style?: any; className?: string; testID?: string; [key: string]: any }>;

  export const GlassView: GlassComponent;
  export const GlassButton: GlassComponent;
  export const GlassCard: GlassComponent;
  export const GlassModal: GlassComponent;
  export const GlassInput: GlassComponent;
  export const GlassTextarea: GlassComponent;
  export const GlassSelect: GlassComponent;
  export const GlassCheckbox: GlassComponent;
  export const GlassToggle: GlassComponent;
  export const GlassChevron: GlassComponent;
  export const GlassAvatar: GlassComponent;
  export const GlassStatCard: GlassComponent;
  export const GlassBadge: GlassComponent;
  export const GlassPlaceholder: GlassComponent;
  export const GlassTabs: GlassComponent;
  export const GlassTabContainer: GlassComponent;
  export const GlassProgressBar: GlassComponent;
  export const GlassErrorBanner: GlassComponent;
  export const GlassEmptyState: GlassComponent;
  export const GlassToast: GlassComponent;
  export const GlassToastContainer: GlassComponent;
  export const GlassBreadcrumbs: GlassComponent;
  export const GlassCategoryPill: GlassComponent;
  export const GlassSplitterHandle: GlassComponent;
  export const GlassResizablePanel: GlassComponent;
  export const GlassDraggableExpander: GlassComponent;
  export const GlassReorderableList: GlassComponent;
  export const GlassSectionItem: GlassComponent;
  export const GlassTable: GlassComponent;
  export const GlassTableCell: GlassComponent;
  export const GlassLiveChannelCard: GlassComponent;
  export const GlassAnalogClock: GlassComponent;
  export const GlassTVSwitch: GlassComponent;
  export const GlassCarousel3D: GlassComponent;
  export const GlassPosterCard: GlassComponent;
  export const GlassRadar: GlassComponent;
  export const GlassGauge: GlassComponent;
  export const GlassHeartbeat: GlassComponent;
  export const GlassTooltip: GlassComponent;
  export const GlassFAB: GlassComponent;
  export const GlassPageHeader: GlassComponent;
  export const GlassLocationConsentModal: GlassComponent;
  export const NotificationProvider: GlassComponent;
  export function useGlassTheme(): any;
  export function useNotifications(): any;
  export function useGlassAlert(): any;
  export type ButtonVariant = string;
  export type BadgeVariant = string;
  export type ModalType = string;
}

// ─── @bayit/shared-avatar-services ───────────────────────
declare module '@bayit/shared-avatar-services' {
  export interface AvatarGenerationConfig {
    apiKey: string;
    apiUrl: string;
    [key: string]: any;
  }

  export type AvatarStyle = string;
  export type AvatarQuality = string;
  export type AvatarStatus = 'pending' | 'processing' | 'completed' | 'failed' | string;
  export type AvatarEmotion = string;

  export interface AvatarGenerationRequest {
    userId: string;
    photoUrl: string;
    style?: AvatarStyle;
    quality?: AvatarQuality;
    options?: {
      enableAnimations?: boolean;
      enableEmotions?: boolean;
      [key: string]: any;
    };
  }

  export interface AvatarGenerationResult {
    avatarId: string;
    status: AvatarStatus;
    glbUrl?: string;
    thumbnailUrl?: string;
    [key: string]: any;
  }

  export interface AvatarGenerationProgress {
    avatarId: string;
    status: AvatarStatus;
    progress: number;
    message?: string;
    [key: string]: any;
  }

  export interface AvatarState {
    isVisible: boolean;
    isSpeaking: boolean;
    isListening: boolean;
    emotion: AvatarEmotion;
    [key: string]: any;
  }

  export interface AvatarPreferences {
    avatarId?: string;
    enabled: boolean;
    style?: AvatarStyle;
    quality?: AvatarQuality;
    animationsEnabled: boolean;
    emotionsEnabled: boolean;
    [key: string]: any;
  }

  export interface PreferencesStorageAdapter {
    save(preferences: AvatarPreferences): Promise<void>;
    load(): Promise<AvatarPreferences | null>;
    clear(): Promise<void>;
  }

  export class AvatarGenerationService {
    constructor(config: AvatarGenerationConfig);
    generateAvatar(request: AvatarGenerationRequest): Promise<AvatarGenerationResult>;
    getAvatar(avatarId: string): Promise<AvatarGenerationResult | null>;
    deleteAvatar(avatarId: string): Promise<void>;
    onProgress(avatarId: string, callback: (progress: AvatarGenerationProgress) => void): () => void;
  }

  export const avatarStateManager: {
    getState(): AvatarState;
    addListener(listener: (state: AvatarState) => void): void;
    removeListener(listener: (state: AvatarState) => void): void;
    show(): void;
    hide(): void;
    startSpeaking(): void;
    stopSpeaking(): void;
    startListening(): void;
    stopListening(): void;
    setEmotionFromFrustration(level: number): void;
  };

  export class AvatarPreferencesManager {
    constructor(defaults: Partial<AvatarPreferences>, adapter?: PreferencesStorageAdapter);
    initialize(): Promise<void>;
    getPreferences(): AvatarPreferences;
    updatePreferences(updates: Partial<AvatarPreferences>): Promise<void>;
    setAvatarId(avatarId: string | undefined): Promise<void>;
    enable(): Promise<void>;
    disable(): Promise<void>;
    addListener(listener: (preferences: AvatarPreferences) => void): void;
    removeListener(listener: (preferences: AvatarPreferences) => void): void;
  }
}

// ─── @bayit/shared-voice-services ────────────────────────
declare module '@bayit/shared-voice-services' {
  export interface VoiceAnalysis {
    frustrationLevel: number;
    suggestion?: string;
    emotionLabel?: string;
    confidence?: number;
    [key: string]: any;
  }

  export interface ProcessedCommand {
    intent: {
      action: string;
      [key: string]: any;
    };
    shouldExecute: boolean;
    confidence?: number;
    [key: string]: any;
  }

  export const voiceProcessor: {
    processTranscript(transcription: string, confidence: number): ProcessedCommand;
    clearHistory(): void;
    [key: string]: any;
  };

  export const emotionalIntelligenceService: {
    analyzeVoicePattern(
      transcription: string,
      recentCommands: string[],
      successHistory: boolean[]
    ): VoiceAnalysis;
    adjustTTSRate(baseRate: number, frustrationLevel: number): number;
    shouldOfferHelp(analysis: VoiceAnalysis, recentCommands: string[]): boolean;
    [key: string]: any;
  };

  export const conversationContextManager: {
    addUserMessage(sessionId: string, message: string, metadata?: Record<string, any>): void;
    clearContext(sessionId: string): void;
    [key: string]: any;
  };

  export const voiceAnalytics: {
    startSession(sessionId: string): void;
    endSession(sessionId: string): void;
    trackCommand(
      sessionId: string,
      action: string,
      success: boolean,
      confidence: number,
      frustrationLevel: number
    ): void;
    [key: string]: any;
  };
}

// ─── @bayit/shared/components/ErrorBoundary ──────────────
declare module '@bayit/shared/components/ErrorBoundary' {
  export interface ErrorBoundarySentry {
    captureException: (error: any, options?: { extra?: Record<string, unknown> }) => void;
  }
  export function initErrorBoundarySentry(integration: ErrorBoundarySentry): void;
}

// ─── @react-native-async-storage/async-storage ───────────
declare module '@react-native-async-storage/async-storage' {
  const AsyncStorage: {
    getItem(key: string): Promise<string | null>;
    setItem(key: string, value: string): Promise<void>;
    removeItem(key: string): Promise<void>;
    mergeItem(key: string, value: string): Promise<void>;
    clear(): Promise<void>;
    getAllKeys(): Promise<readonly string[]>;
    multiGet(keys: readonly string[]): Promise<readonly [string, string | null][]>;
    multiSet(keyValuePairs: [string, string][]): Promise<void>;
    multiRemove(keys: readonly string[]): Promise<void>;
    multiMerge(keyValuePairs: [string, string][]): Promise<void>;
    flushGetRequests(): void;
  };
  export default AsyncStorage;
}

// ─── @olorin/icons ────────────────────────────────────────
declare module '@olorin/icons' {
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
    [key: string]: any;
  }>;
  export const NativeIcon: ComponentType<{
    name: string;
    size?: IconSize;
    color?: string;
    style?: any;
    [key: string]: any;
  }>;
  export default Icon;
}

// ─── lucide-react-native ──────────────────────────────────
declare module 'lucide-react-native' {
  import type { ComponentType } from 'react';
  export interface LucideProps {
    size?: number | string;
    color?: string;
    strokeWidth?: number;
    absoluteStrokeWidth?: boolean;
    style?: any;
    [key: string]: any;
  }
  type LucideIcon = ComponentType<LucideProps>;
  export const Activity: LucideIcon;
  export const AlertCircle: LucideIcon;
  export const AlertTriangle: LucideIcon;
  export const Archive: LucideIcon;
  export const ArrowLeft: LucideIcon;
  export const ArrowRight: LucideIcon;
  export const Bell: LucideIcon;
  export const BookOpen: LucideIcon;
  export const Camera: LucideIcon;
  export const Check: LucideIcon;
  export const CheckCircle: LucideIcon;
  export const ChevronDown: LucideIcon;
  export const ChevronLeft: LucideIcon;
  export const ChevronRight: LucideIcon;
  export const ChevronUp: LucideIcon;
  export const Circle: LucideIcon;
  export const Clock: LucideIcon;
  export const Copy: LucideIcon;
  export const Download: LucideIcon;
  export const Edit: LucideIcon;
  export const ExternalLink: LucideIcon;
  export const Eye: LucideIcon;
  export const EyeOff: LucideIcon;
  export const File: LucideIcon;
  export const Filter: LucideIcon;
  export const Globe: LucideIcon;
  export const Grid: LucideIcon;
  export const Heart: LucideIcon;
  export const Home: LucideIcon;
  export const Image: LucideIcon;
  export const Info: LucideIcon;
  export const Layers: LucideIcon;
  export const List: LucideIcon;
  export const Loader: LucideIcon;
  export const Lock: LucideIcon;
  export const LogOut: LucideIcon;
  export const Mail: LucideIcon;
  export const MapPin: LucideIcon;
  export const Menu: LucideIcon;
  export const MessageCircle: LucideIcon;
  export const MessageSquare: LucideIcon;
  export const Mic: LucideIcon;
  export const MicOff: LucideIcon;
  export const Minus: LucideIcon;
  export const Monitor: LucideIcon;
  export const Moon: LucideIcon;
  export const MoreHorizontal: LucideIcon;
  export const MoreVertical: LucideIcon;
  export const Move: LucideIcon;
  export const Music: LucideIcon;
  export const Navigation: LucideIcon;
  export const Package: LucideIcon;
  export const Pause: LucideIcon;
  export const Phone: LucideIcon;
  export const Play: LucideIcon;
  export const Plus: LucideIcon;
  export const Power: LucideIcon;
  export const RefreshCw: LucideIcon;
  export const RotateCcw: LucideIcon;
  export const Save: LucideIcon;
  export const Search: LucideIcon;
  export const Send: LucideIcon;
  export const Settings: LucideIcon;
  export const Share: LucideIcon;
  export const Share2: LucideIcon;
  export const Shield: LucideIcon;
  export const SkipBack: LucideIcon;
  export const SkipForward: LucideIcon;
  export const Sliders: LucideIcon;
  export const Smartphone: LucideIcon;
  export const Speaker: LucideIcon;
  export const Square: LucideIcon;
  export const Star: LucideIcon;
  export const Sun: LucideIcon;
  export const Target: LucideIcon;
  export const Terminal: LucideIcon;
  export const Trash: LucideIcon;
  export const Trash2: LucideIcon;
  export const TrendingUp: LucideIcon;
  export const Trophy: LucideIcon;
  export const Type: LucideIcon;
  export const Unlock: LucideIcon;
  export const Upload: LucideIcon;
  export const User: LucideIcon;
  export const UserPlus: LucideIcon;
  export const Users: LucideIcon;
  export const Video: LucideIcon;
  export const VideoOff: LucideIcon;
  export const Volume: LucideIcon;
  export const Volume1: LucideIcon;
  export const Volume2: LucideIcon;
  export const VolumeX: LucideIcon;
  export const Wifi: LucideIcon;
  export const WifiOff: LucideIcon;
  export const X: LucideIcon;
  export const XCircle: LucideIcon;
  export const Zap: LucideIcon;
  export const ZoomIn: LucideIcon;
  export const ZoomOut: LucideIcon;
  export const Scissors: LucideIcon;
  export const Maximize: LucideIcon;
  export const Minimize: LucideIcon;
  export const Headphones: LucideIcon;
  export const Radio: LucideIcon;
  export const Bookmark: LucideIcon;
  export const Tag: LucideIcon;
  export const Calendar: LucideIcon;
  export const CreditCard: LucideIcon;
  export const DollarSign: LucideIcon;
  export const Hash: LucideIcon;
  export const Key: LucideIcon;
  export const Link: LucideIcon;
  export const Percent: LucideIcon;
  export const Repeat: LucideIcon;
  export const Shuffle: LucideIcon;
  export const ThumbsDown: LucideIcon;
  export const ThumbsUp: LucideIcon;
  export const TvMinimal: LucideIcon;
  export const Tv: LucideIcon;
  export const Subtitles: LucideIcon;
  export const Languages: LucideIcon;
  export const Captions: LucideIcon;
  export const Mic2: LucideIcon;
  export const StickerIcon: LucideIcon;
  export const Smile: LucideIcon;
  export const Sparkles: LucideIcon;
  export const Wand: LucideIcon;
  export const Wand2: LucideIcon;
  export const Award: LucideIcon;
  export const Medal: LucideIcon;
  export const Crown: LucideIcon;
  export const Flame: LucideIcon;
  export const Gift: LucideIcon;
  export const PartyPopper: LucideIcon;
  export const Fingerprint: LucideIcon;
  export const ScanFace: LucideIcon;
  export const Brain: LucideIcon;
  export const Cpu: LucideIcon;
  export const Waveform: LucideIcon;
  export const AudioLines: LucideIcon;
  export const ScanLine: LucideIcon;
  export const Blend: LucideIcon;
  export const Palette: LucideIcon;
  export const Brush: LucideIcon;
  export const PenTool: LucideIcon;
  export const Film: LucideIcon;
  export const Clapperboard: LucideIcon;
  export const Subtitles2: LucideIcon;
  export const LayoutGrid: LucideIcon;
  export const AlignLeft: LucideIcon;
  export const AlignRight: LucideIcon;
  export const AlignCenter: LucideIcon;
  export const Newspaper: LucideIcon;
  export const Rss: LucideIcon;
  export const Database: LucideIcon;
  export const Server: LucideIcon;
  export const Cloud: LucideIcon;
  export const CloudOff: LucideIcon;
  export const HardDrive: LucideIcon;
  export const FolderOpen: LucideIcon;
  export const Folder: LucideIcon;
  export const FileText: LucideIcon;
  export const FileVideo: LucideIcon;
  export const FileAudio: LucideIcon;
  export const QrCode: LucideIcon;
  export const ScanQrCode: LucideIcon;
  export const Binary: LucideIcon;
  export const Code: LucideIcon;
  export const Code2: LucideIcon;
  export const Columns: LucideIcon;
  export const LayoutDashboard: LucideIcon;
  export const BarChart: LucideIcon;
  export const BarChart2: LucideIcon;
  export const LineChart: LucideIcon;
  export const PieChart: LucideIcon;
  export const ArrowUp: LucideIcon;
  export const ArrowDown: LucideIcon;
  export const CornerDownLeft: LucideIcon;
  export const FastForward: LucideIcon;
  export const Rewind: LucideIcon;
  export const Drama: LucideIcon;
  export const Archive: LucideIcon;
  export const Pin: LucideIcon;
  export const CheckSquare: LucideIcon;
  export const FileCheck: LucideIcon;
  export const Lightbulb: LucideIcon;
  export const Timer: LucideIcon;
  export { LucideIcon };
}

// ─── @react-native-clipboard/clipboard ───────────────────
declare module '@react-native-clipboard/clipboard' {
  const Clipboard: {
    getString(): Promise<string>;
    setString(content: string): void;
    hasString(): Promise<boolean>;
  };
  export default Clipboard;
}

// ─── lucide-react (aliased from lucide-react-native) ─────────────
declare module 'lucide-react' {
  import type { ComponentType, SVGAttributes } from 'react';
  interface LucideProps extends SVGAttributes<SVGElement> {
    size?: number | string;
    color?: string;
    strokeWidth?: number;
    absoluteStrokeWidth?: boolean;
  }
  type LucideIcon = ComponentType<LucideProps>;
  // All icons are dynamic exports
  export const Eye: LucideIcon;
  export const EyeOff: LucideIcon;
  export const Lock: LucideIcon;
  export const Mail: LucideIcon;
  export const User: LucideIcon;
  export const Settings: LucideIcon;
  export const Search: LucideIcon;
  export const Menu: LucideIcon;
  export const X: LucideIcon;
  export const Check: LucideIcon;
  export const ChevronDown: LucideIcon;
  export const ChevronUp: LucideIcon;
  export const ChevronLeft: LucideIcon;
  export const ChevronRight: LucideIcon;
  export const Plus: LucideIcon;
  export const Minus: LucideIcon;
  export const Trash: LucideIcon;
  export const Trash2: LucideIcon;
  export const Edit: LucideIcon;
  export const Edit2: LucideIcon;
  export const Edit3: LucideIcon;
  export const Copy: LucideIcon;
  export const Download: LucideIcon;
  export const Upload: LucideIcon;
  export const Share: LucideIcon;
  export const Share2: LucideIcon;
  export const Heart: LucideIcon;
  export const Star: LucideIcon;
  export const Bell: LucideIcon;
  export const BellOff: LucideIcon;
  export const Home: LucideIcon;
  export const ArrowLeft: LucideIcon;
  export const ArrowRight: LucideIcon;
  export const ArrowUp: LucideIcon;
  export const ArrowDown: LucideIcon;
  export const ExternalLink: LucideIcon;
  export const Link: LucideIcon;
  export const Loader: LucideIcon;
  export const Loader2: LucideIcon;
  export const RefreshCw: LucideIcon;
  export const RotateCcw: LucideIcon;
  export const Info: LucideIcon;
  export const AlertCircle: LucideIcon;
  export const AlertTriangle: LucideIcon;
  export const XCircle: LucideIcon;
  export const CheckCircle: LucideIcon;
  export const CheckCircle2: LucideIcon;
  export const HelpCircle: LucideIcon;
  export const MoreHorizontal: LucideIcon;
  export const MoreVertical: LucideIcon;
  export const Filter: LucideIcon;
  export const SortAsc: LucideIcon;
  export const SortDesc: LucideIcon;
  export const Calendar: LucideIcon;
  export const Clock: LucideIcon;
  export const Globe: LucideIcon;
  export const Map: LucideIcon;
  export const MapPin: LucideIcon;
  export const Phone: LucideIcon;
  export const Smartphone: LucideIcon;
  export const Tablet: LucideIcon;
  export const Monitor: LucideIcon;
  export const Tv: LucideIcon;
  export const Wifi: LucideIcon;
  export const WifiOff: LucideIcon;
  export const Bluetooth: LucideIcon;
  export const Camera: LucideIcon;
  export const Image: LucideIcon;
  export const Film: LucideIcon;
  export const Video: LucideIcon;
  export const Music: LucideIcon;
  export const Mic: LucideIcon;
  export const MicOff: LucideIcon;
  export const Volume: LucideIcon;
  export const Volume1: LucideIcon;
  export const Volume2: LucideIcon;
  export const VolumeX: LucideIcon;
  export const Play: LucideIcon;
  export const Pause: LucideIcon;
  export const SkipBack: LucideIcon;
  export const SkipForward: LucideIcon;
  export const FastForward: LucideIcon;
  export const Rewind: LucideIcon;
  export const Maximize: LucideIcon;
  export const Maximize2: LucideIcon;
  export const Minimize: LucideIcon;
  export const Minimize2: LucideIcon;
  export const Shield: LucideIcon;
  export const ShieldCheck: LucideIcon;
  export const Key: LucideIcon;
  export const LogIn: LucideIcon;
  export const LogOut: LucideIcon;
  export const UserPlus: LucideIcon;
  export const UserMinus: LucideIcon;
  export const Users: LucideIcon;
  export const MessageCircle: LucideIcon;
  export const MessageSquare: LucideIcon;
  export const Send: LucideIcon;
  export const Inbox: LucideIcon;
  export const Tag: LucideIcon;
  export const Bookmark: LucideIcon;
  export const BookOpen: LucideIcon;
  export const FileText: LucideIcon;
  export const File: LucideIcon;
  export const Folder: LucideIcon;
  export const FolderOpen: LucideIcon;
  export const Save: LucideIcon;
  export const Clipboard: LucideIcon;
  export const Zap: LucideIcon;
  export const Award: LucideIcon;
  export const Gift: LucideIcon;
  export const Sparkles: LucideIcon;
  export const Crown: LucideIcon;
  export const Target: LucideIcon;
  export const TrendingUp: LucideIcon;
  export const TrendingDown: LucideIcon;
  export const BarChart: LucideIcon;
  export const BarChart2: LucideIcon;
  export const LineChart: LucideIcon;
  export const PieChart: LucideIcon;
  export const Activity: LucideIcon;
  export const Layers: LucideIcon;
  export const Layout: LucideIcon;
  export const Grid: LucideIcon;
  export const List: LucideIcon;
  export const Columns: LucideIcon;
  export const LayoutDashboard: LucideIcon;
  export const SlidersHorizontal: LucideIcon;
  export const Sliders: LucideIcon;
  export const GripVertical: LucideIcon;
  export const GripHorizontal: LucideIcon;
  export const Move: LucideIcon;
  export const Palette: LucideIcon;
  export const Paintbrush: LucideIcon;
  export const Wand2: LucideIcon;
  export const Scissors: LucideIcon;
  export const Type: LucideIcon;
  export const Bold: LucideIcon;
  export const Italic: LucideIcon;
  export const Underline: LucideIcon;
  export const AlignLeft: LucideIcon;
  export const AlignCenter: LucideIcon;
  export const AlignRight: LucideIcon;
  export const Code: LucideIcon;
  export const Code2: LucideIcon;
  export const Terminal: LucideIcon;
  export const Database: LucideIcon;
  export const Server: LucideIcon;
  export const Cloud: LucideIcon;
  export const CloudOff: LucideIcon;
  export const HardDrive: LucideIcon;
  export const Cpu: LucideIcon;
  export const Binary: LucideIcon;
  export const Hash: LucideIcon;
  export const AtSign: LucideIcon;
  export const Percent: LucideIcon;
  export const DollarSign: LucideIcon;
  export const CreditCard: LucideIcon;
  export const ShoppingCart: LucideIcon;
  export const ShoppingBag: LucideIcon;
  export const Package: LucideIcon;
  export const Truck: LucideIcon;
  export const Navigation: LucideIcon;
  export const Compass: LucideIcon;
  export const Sun: LucideIcon;
  export const Moon: LucideIcon;
  export const Sunrise: LucideIcon;
  export const Sunset: LucideIcon;
  export const Flame: LucideIcon;
  export const Snowflake: LucideIcon;
  export const Droplet: LucideIcon;
  export const Wind: LucideIcon;
  export const Umbrella: LucideIcon;
  export const ThumbsUp: LucideIcon;
  export const ThumbsDown: LucideIcon;
  export const Smile: LucideIcon;
  export const Frown: LucideIcon;
  export const Meh: LucideIcon;
  export const Eye2: LucideIcon;
  export const Fingerprint: LucideIcon;
  export const Scan: LucideIcon;
  export const ScanQrCode: LucideIcon;
  export const QrCode: LucideIcon;
  export const PlayCircle: LucideIcon;
  export const StopCircle: LucideIcon;
  export const PauseCircle: LucideIcon;
  export const CornerDownLeft: LucideIcon;
  export const Rss: LucideIcon;
  export const RadioTower: LucideIcon;
  export const Radio: LucideIcon;
  export const Headphones: LucideIcon;
  export const Speaker: LucideIcon;
  export const FileVideo: LucideIcon;
  export const FileAudio: LucideIcon;
  export const Subtitles: LucideIcon;
  export const Languages: LucideIcon;
  export const Voicemail: LucideIcon;
  export const PhoneOff: LucideIcon;
  export const Bot: LucideIcon;
  export const Brain: LucideIcon;
  export const Lightbulb: LucideIcon;
  export const Rocket: LucideIcon;
  export const Gem: LucideIcon;
  export const Trophy: LucideIcon;
  export const Flag: LucideIcon;
  export const Crosshair: LucideIcon;
  export const Anchor: LucideIcon;
  export const LifeBuoy: LucideIcon;
  export const Timer: LucideIcon;
  export const Hourglass: LucideIcon;
  export const PanelLeft: LucideIcon;
  export const PanelRight: LucideIcon;
  export const Sidebar: LucideIcon;
  export const ToggleLeft: LucideIcon;
  export const ToggleRight: LucideIcon;
  export const Power: LucideIcon;
  export const CircleDot: LucideIcon;
  export const Circle: LucideIcon;
  export const Square: LucideIcon;
  export const Triangle: LucideIcon;
  export const Hexagon: LucideIcon;
  export const Octagon: LucideIcon;
  export const Asterisk: LucideIcon;
  export const ArrowUpRight: LucideIcon;
  export const ArrowDownRight: LucideIcon;
  export const ArrowUpLeft: LucideIcon;
  export const ArrowDownLeft: LucideIcon;
  export const MoveUp: LucideIcon;
  export const MoveDown: LucideIcon;
  export const MoveLeft: LucideIcon;
  export const MoveRight: LucideIcon;
  export const Repeat: LucideIcon;
  export const Repeat2: LucideIcon;
  export const Shuffle: LucideIcon;
  export const CornerUpRight: LucideIcon;
  export const CornerUpLeft: LucideIcon;
  export const CornerDownRight: LucideIcon;
  export const Undo: LucideIcon;
  export const Undo2: LucideIcon;
  export const Redo: LucideIcon;
  export const Redo2: LucideIcon;
  export const ZoomIn: LucideIcon;
  export const ZoomOut: LucideIcon;
  export const Expand: LucideIcon;
  export const Shrink: LucideIcon;
  export const RotateCw: LucideIcon;
  export const Fullscreen: LucideIcon;
  export const CircleCheck: LucideIcon;
  export const XOctagon: LucideIcon;
  export const Ban: LucideIcon;
  export const Handshake: LucideIcon;
  export const Puzzle: LucideIcon;
  export const Network: LucideIcon;
  export const Route: LucideIcon;
  export const Cog: LucideIcon;
  export const Wrench: LucideIcon;
  export const Hammer: LucideIcon;
  export const ScrollText: LucideIcon;
  export const Book: LucideIcon;
  export const Notebook: LucideIcon;
  export const Library: LucideIcon;
  export const GraduationCap: LucideIcon;
  export const School: LucideIcon;
  export const Building: LucideIcon;
  export const Building2: LucideIcon;
  export const Store: LucideIcon;
  export const Factory: LucideIcon;
  export const Landmark: LucideIcon;
  export const Church: LucideIcon;
  export const Contact: LucideIcon;
  export const Contact2: LucideIcon;
  export const UserCircle: LucideIcon;
  export const UserCircle2: LucideIcon;
  export const UserCheck: LucideIcon;
  export const UserCog: LucideIcon;
  export const UserX: LucideIcon;
  export const Users2: LucideIcon;
  export const Group: LucideIcon;
  export const PersonStanding: LucideIcon;
  export const Baby: LucideIcon;
  export const Accessibility: LucideIcon;
  export const Cat: LucideIcon;
  export const Dog: LucideIcon;
  export const Bird: LucideIcon;
  export const Bug: LucideIcon;
  export const Fish: LucideIcon;
  export const Flower: LucideIcon;
  export const Flower2: LucideIcon;
  export const Leaf: LucideIcon;
  export const Trees: LucideIcon;
  export const Mountain: LucideIcon;
  export const Waves: LucideIcon;
  export const Receipt: LucideIcon;
  export const Wallet: LucideIcon;
  export const Banknote: LucideIcon;
  export const Coins: LucideIcon;
  export const PiggyBank: LucideIcon;
  export const BadgeCheck: LucideIcon;
  export const BadgePlus: LucideIcon;
  export const BadgeMinus: LucideIcon;
  export const BadgeX: LucideIcon;
  export const BadgeAlert: LucideIcon;
  export const PartyPopper: LucideIcon;
  export const Cake: LucideIcon;
  export const Candy: LucideIcon;
  export const IceCream: LucideIcon;
  export const Pizza: LucideIcon;
  export const Coffee: LucideIcon;
  export const Wine: LucideIcon;
  export const Beer: LucideIcon;
  export const Utensils: LucideIcon;
  export const ChefHat: LucideIcon;
  export const Soup: LucideIcon;
  export const Apple: LucideIcon;
  export const Cherry: LucideIcon;
  export const Grape: LucideIcon;
  export const Citrus: LucideIcon;
  export const Carrot: LucideIcon;
  export const Salad: LucideIcon;
  export const Sandwich: LucideIcon;
  export const Dumbbell: LucideIcon;
  export const Bike: LucideIcon;
  export const Car: LucideIcon;
  export const Bus: LucideIcon;
  export const Train: LucideIcon;
  export const Plane: LucideIcon;
  export const Ship: LucideIcon;
  export const Satellite: LucideIcon;
  export const Globe2: LucideIcon;
  export const Newspaper: LucideIcon;
  export const Megaphone: LucideIcon;
  export const Clapperboard: LucideIcon;
  export const Gamepad: LucideIcon;
  export const Gamepad2: LucideIcon;
  export const Dice1: LucideIcon;
  export const Dice2: LucideIcon;
  export const Dice3: LucideIcon;
  export const Dice4: LucideIcon;
  export const Dice5: LucideIcon;
  export const Dice6: LucideIcon;
  export const Puzzle2: LucideIcon;
  export const Swords: LucideIcon;
  export const Joystick: LucideIcon;
  export const Tent: LucideIcon;
  export const Shirt: LucideIcon;
  export const Watch: LucideIcon;
  export const Glasses: LucideIcon;
  export const Footprints: LucideIcon;
  export const Armchair: LucideIcon;
  export const Bed: LucideIcon;
  export const Bath: LucideIcon;
  export const Lamp: LucideIcon;
  export const LampDesk: LucideIcon;
  export const Plug: LucideIcon;
  export const Cable: LucideIcon;
  export const Battery: LucideIcon;
  export const BatteryCharging: LucideIcon;
  export const BatteryFull: LucideIcon;
  export const BatteryLow: LucideIcon;
  export const BatteryMedium: LucideIcon;
  export const BatteryWarning: LucideIcon;
  export const Signal: LucideIcon;
  export const SignalHigh: LucideIcon;
  export const SignalLow: LucideIcon;
  export const SignalMedium: LucideIcon;
  export const SignalZero: LucideIcon;
  export const Printer: LucideIcon;
  export const ScanLine: LucideIcon;
  export const Barcode: LucideIcon;
  export const NFC: LucideIcon;
  export const Usb: LucideIcon;
  export const Hdmi: LucideIcon;
  export const Mouse: LucideIcon;
  export const Keyboard: LucideIcon;
  export const Router: LucideIcon;
  export const Webhook: LucideIcon;
  export const Api: LucideIcon;
  export const Braces: LucideIcon;
  export const Brackets: LucideIcon;
  export const Variable: LucideIcon;
  export const Regex: LucideIcon;
  export const GitBranch: LucideIcon;
  export const GitCommit: LucideIcon;
  export const GitMerge: LucideIcon;
  export const GitPullRequest: LucideIcon;
  export const GitFork: LucideIcon;
  export const Github: LucideIcon;
  export const Gitlab: LucideIcon;
  export const Chrome: LucideIcon;
  export const Firefox: LucideIcon;
  export const CaseSensitive: LucideIcon;
  export const CaseUpper: LucideIcon;
  export const CaseLower: LucideIcon;
  export const Strikethrough: LucideIcon;
  export const Subscript: LucideIcon;
  export const Superscript: LucideIcon;
  export const ListOrdered: LucideIcon;
  export const ListChecks: LucideIcon;
  export const ListTodo: LucideIcon;
  export const ListTree: LucideIcon;
  export const ListFilter: LucideIcon;
  export const Table: LucideIcon;
  export const Table2: LucideIcon;
  export const Kanban: LucideIcon;
  export const CalendarDays: LucideIcon;
  export const CalendarCheck: LucideIcon;
  export const CalendarX: LucideIcon;
  export const CalendarPlus: LucideIcon;
  export const CalendarMinus: LucideIcon;
  export const CalendarRange: LucideIcon;
  export const CalendarHeart: LucideIcon;
  export const ClockArrowUp: LucideIcon;
  export const TimerReset: LucideIcon;
  export const Alarm: LucideIcon;
  export const AlarmCheck: LucideIcon;
  export const History: LucideIcon;
  export const Undo3: LucideIcon;
  export const Forward: LucideIcon;
  export const Reply: LucideIcon;
  export const ReplyAll: LucideIcon;
  export const AtSign2: LucideIcon;
  export const MailOpen: LucideIcon;
  export const MailPlus: LucideIcon;
  export const MailMinus: LucideIcon;
  export const MailCheck: LucideIcon;
  export const MailWarning: LucideIcon;
  export const MailX: LucideIcon;
  export const MailSearch: LucideIcon;
  export const MessagesSquare: LucideIcon;
  export const BotMessageSquare: LucideIcon;
  export const Workflow: LucideIcon;
  export const FlaskConical: LucideIcon;
  export const TestTube: LucideIcon;
  export const TestTubes: LucideIcon;
  export const Microscope: LucideIcon;
  export const Stethoscope: LucideIcon;
  export const Pill: LucideIcon;
  export const Syringe: LucideIcon;
  export const HeartPulse: LucideIcon;
  export const CircleEllipsis: LucideIcon;
  export const MoreHorizontalIcon: LucideIcon;
  export const Pen: LucideIcon;
  export const PenLine: LucideIcon;
  export const Pencil: LucideIcon;
  export const PencilLine: LucideIcon;
  export const Eraser: LucideIcon;
  export const Highlighter: LucideIcon;
  export const Crop: LucideIcon;
  export const Focus: LucideIcon;
  export const Aperture: LucideIcon;
  export const CameraOff: LucideIcon;
  export const ImageOff: LucideIcon;
  export const ImagePlus: LucideIcon;
  export const Ratio: LucideIcon;
  export const PictureInPicture: LucideIcon;
  export const PictureInPicture2: LucideIcon;
  export const Frame: LucideIcon;
  export const Gallery: LucideIcon;
  export const Projector: LucideIcon;
  export const ScreenShare: LucideIcon;
  export const ScreenShareOff: LucideIcon;
  export const Cast: LucideIcon;
  export const Airplay: LucideIcon;
  export const MonitorPlay: LucideIcon;
  export const MonitorStop: LucideIcon;
  export const AudioLines: LucideIcon;
  export const AudioWaveform: LucideIcon;
  export const ListMusic: LucideIcon;
  export const Disc: LucideIcon;
  export const Disc2: LucideIcon;
  export const Disc3: LucideIcon;
  export const Podcast: LucideIcon;
  export const BoomBox: LucideIcon;
  export const Piano: LucideIcon;
  export const Guitar: LucideIcon;
  export const Drum: LucideIcon;
  export const Captions: LucideIcon;
  export const CaptionsOff: LucideIcon;
  export const Clapperboard2: LucideIcon;
  export const Theater: LucideIcon;
  export const Popcorn: LucideIcon;
  export const PartyPopper2: LucideIcon;
  export const Confetti: LucideIcon;
  export const Fireworks: LucideIcon;
  export const CandlestickChart: LucideIcon;
  export const AreaChart: LucideIcon;
  export const Gauge: LucideIcon;
  export const ChartBar: LucideIcon;
  export const ChartLine: LucideIcon;
  export const ChartPie: LucideIcon;
  export const ChartColumn: LucideIcon;
  export const ChartArea: LucideIcon;
  export const ChartScatter: LucideIcon;
  export const ChartSpline: LucideIcon;
  export const ChartNoAxesColumn: LucideIcon;
  export const ChartNoAxesGantt: LucideIcon;
  export const Presentation: LucideIcon;
  export const Tv2: LucideIcon;
  export const ScreenShareIcon: LucideIcon;
  export const ArrowBigUp: LucideIcon;
  export const ArrowBigDown: LucideIcon;
  export const ArrowBigLeft: LucideIcon;
  export const ArrowBigRight: LucideIcon;
  export const ChevronsUp: LucideIcon;
  export const ChevronsDown: LucideIcon;
  export const ChevronsLeft: LucideIcon;
  export const ChevronsRight: LucideIcon;
  export const ChevronsUpDown: LucideIcon;
  export const ChevronsLeftRight: LucideIcon;
  export const ArrowUpDown: LucideIcon;
  export const ArrowLeftRight: LucideIcon;
  export const ArrowUpFromLine: LucideIcon;
  export const ArrowDownFromLine: LucideIcon;
  export const ArrowLeftFromLine: LucideIcon;
  export const ArrowRightFromLine: LucideIcon;
  export const ArrowUpToLine: LucideIcon;
  export const ArrowDownToLine: LucideIcon;
  export const ArrowLeftToLine: LucideIcon;
  export const ArrowRightToLine: LucideIcon;
  export const RefreshCcw: LucideIcon;
  export const FolderTree: LucideIcon;
  export const FileEdit: LucideIcon;
  export const Grid3x3: LucideIcon;
  export const Mic2: LucideIcon;
  export const BarChart3: LucideIcon;
  export const FlaskConicalOff: LucideIcon;
  export const Merge: LucideIcon;
  export const StarOff: LucideIcon;
  export const LayoutGrid: LucideIcon;
  export const Facebook: LucideIcon;
  export const Twitter: LucideIcon;
  export const Instagram: LucideIcon;
  export const Youtube: LucideIcon;
  export const Archive: LucideIcon;
  export const Pin: LucideIcon;
  export const Drama: LucideIcon;
  export const SplitSquareVertical: LucideIcon;
  export const ArrowDownAZ: LucideIcon;
  export const ArrowUpAZ: LucideIcon;
  export const Contrast: LucideIcon;
  export const BellRing: LucideIcon;
  export const ShieldAlert: LucideIcon;
  export const KeyRound: LucideIcon;
  export const ArrowUpCircle: LucideIcon;
  export const CheckSquare: LucideIcon;
  export const ExternalLinkIcon: LucideIcon;
  export const FileX: LucideIcon;
  export const FileCheck: LucideIcon;
}

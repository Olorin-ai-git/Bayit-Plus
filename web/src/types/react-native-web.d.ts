/**
 * React Native Web Type Declarations
 *
 * Overrides 'react-native' module resolution for web builds.
 * Provides typed stubs for all RN exports used by shared components,
 * preventing RN global type declarations (FormData, Blob, XMLHttpRequest)
 * from conflicting with DOM types.
 *
 * Style types are intentionally permissive (Record<string, any>) to support:
 * - Animated.Value in numeric style properties (opacity, transform, etc.)
 * - Conditional style arrays with false/undefined values
 * - Mixed StyleSheet + inline styles
 * - Web-specific CSS properties passed through react-native-web
 */

declare module 'react-native' {
  import type { ComponentType, ReactNode, RefObject } from 'react';

  // ─── Permissive Style Types ─────────────────────────────
  // Intentionally loose to accommodate Animated.Value, conditional arrays,
  // and web-specific CSS properties passed through react-native-web.

  export type ViewStyle = Record<string, any>;
  export type TextStyle = Record<string, any>;
  export type ImageStyle = Record<string, any>;
  export type FlexStyle = Record<string, any>;
  export type StyleProp<T> = T | T[] | null | undefined | false | Array<T | null | undefined | false>;

  export type NamedStyles<T> = { [P in keyof T]: ViewStyle | TextStyle | ImageStyle };

  export const StyleSheet: {
    create<T extends NamedStyles<T> | NamedStyles<any>>(styles: T): T;
    flatten<T>(style?: StyleProp<T>): T;
    absoluteFill: ViewStyle;
    absoluteFillObject: ViewStyle;
    hairlineWidth: number;
  };

  // ─── Event Types ────────────────────────────────────────

  export interface NativeSyntheticEvent<T> {
    nativeEvent: T;
    currentTarget: any;
    target: any;
    bubbles: boolean;
    cancelable: boolean;
    defaultPrevented: boolean;
    eventPhase: number;
    isTrusted: boolean;
    preventDefault(): void;
    stopPropagation(): void;
    persist(): void;
    timeStamp: number;
    type: string;
  }

  export interface NativeScrollEvent {
    contentInset: { bottom: number; left: number; right: number; top: number };
    contentOffset: { x: number; y: number };
    contentSize: { height: number; width: number };
    layoutMeasurement: { height: number; width: number };
    zoomScale: number;
  }

  export interface LayoutRectangle {
    x: number;
    y: number;
    width: number;
    height: number;
  }

  export interface LayoutChangeEvent {
    nativeEvent: {
      layout: LayoutRectangle;
    };
  }

  export interface GestureResponderEvent extends NativeSyntheticEvent<{
    changedTouches: any[];
    identifier: number;
    locationX: number;
    locationY: number;
    pageX: number;
    pageY: number;
    target: any;
    timestamp: number;
    touches: any[];
  }> {}

  export interface PressableStateCallbackType {
    pressed: boolean;
    hovered?: boolean;
    focused?: boolean;
  }

  export type AccessibilityRole =
    | 'none' | 'button' | 'link' | 'search' | 'image' | 'keyboardkey'
    | 'text' | 'adjustable' | 'imagebutton' | 'header' | 'summary'
    | 'alert' | 'checkbox' | 'combobox' | 'menu' | 'menubar'
    | 'menuitem' | 'progressbar' | 'radio' | 'radiogroup' | 'scrollbar'
    | 'spinbutton' | 'switch' | 'tab' | 'tabbar' | 'tablist'
    | 'timer' | 'list' | 'toolbar';

  // ─── Component Props ────────────────────────────────────

  export interface ViewProps {
    style?: StyleProp<ViewStyle>;
    children?: ReactNode;
    testID?: string;
    accessible?: boolean;
    accessibilityLabel?: string;
    accessibilityRole?: AccessibilityRole | string;
    accessibilityState?: Record<string, any>;
    accessibilityHint?: string;
    accessibilityValue?: Record<string, any>;
    onLayout?: (event: LayoutChangeEvent) => void;
    pointerEvents?: 'box-none' | 'none' | 'box-only' | 'auto';
    nativeID?: string;
    focusable?: boolean;
    hasTVPreferredFocus?: boolean;
    isTVSelectable?: boolean;
    role?: string;
    [key: string]: any;
  }

  export interface TextProps {
    style?: StyleProp<TextStyle>;
    children?: ReactNode;
    testID?: string;
    accessible?: boolean;
    accessibilityLabel?: string;
    accessibilityRole?: AccessibilityRole | string;
    accessibilityHint?: string;
    numberOfLines?: number;
    ellipsizeMode?: 'head' | 'middle' | 'tail' | 'clip';
    onPress?: (...args: any[]) => void;
    onLongPress?: (...args: any[]) => void;
    selectable?: boolean;
    adjustsFontSizeToFit?: boolean;
    minimumFontScale?: number;
    allowFontScaling?: boolean;
    [key: string]: any;
  }

  export interface PressableProps extends ViewProps {
    onPress?: (...args: any[]) => void;
    onLongPress?: (...args: any[]) => void;
    onPressIn?: (...args: any[]) => void;
    onPressOut?: (...args: any[]) => void;
    disabled?: boolean;
    delayLongPress?: number;
    hitSlop?: number | Record<string, number>;
    pressRetentionOffset?: Record<string, number>;
    android_ripple?: Record<string, any>;
    children?: ReactNode | ((state: PressableStateCallbackType) => ReactNode);
    style?: StyleProp<ViewStyle> | ((state: PressableStateCallbackType) => StyleProp<ViewStyle>);
  }

  export type ImageSourcePropType =
    | { uri: string; width?: number; height?: number; scale?: number; headers?: Record<string, string> }
    | number;

  export interface ImageProps {
    source: ImageSourcePropType | any;
    style?: StyleProp<ImageStyle>;
    resizeMode?: 'cover' | 'contain' | 'stretch' | 'repeat' | 'center';
    onLoad?: (...args: any[]) => void;
    onLoadEnd?: (...args: any[]) => void;
    onLoadStart?: (...args: any[]) => void;
    onError?: (...args: any[]) => void;
    defaultSource?: ImageSourcePropType;
    testID?: string;
    accessible?: boolean;
    accessibilityLabel?: string;
    blurRadius?: number;
    fadeDuration?: number;
    [key: string]: any;
  }

  export interface ScrollViewProps extends ViewProps {
    horizontal?: boolean;
    showsHorizontalScrollIndicator?: boolean;
    showsVerticalScrollIndicator?: boolean;
    pagingEnabled?: boolean;
    scrollEnabled?: boolean;
    bounces?: boolean;
    alwaysBounceVertical?: boolean;
    alwaysBounceHorizontal?: boolean;
    contentContainerStyle?: StyleProp<ViewStyle>;
    keyboardDismissMode?: string;
    keyboardShouldPersistTaps?: string;
    onScroll?: (...args: any[]) => void;
    scrollEventThrottle?: number;
    onMomentumScrollEnd?: (...args: any[]) => void;
    onScrollBeginDrag?: (...args: any[]) => void;
    onContentSizeChange?: (w: number, h: number) => void;
    decelerationRate?: number | 'fast' | 'normal';
    snapToInterval?: number;
    snapToAlignment?: string;
    nestedScrollEnabled?: boolean;
    ref?: any;
  }

  export interface FlatListProps<T> {
    data: ReadonlyArray<T> | null | undefined;
    renderItem: (info: { item: T; index: number; separators: any }) => ReactNode;
    keyExtractor?: (item: T, index: number) => string;
    style?: StyleProp<ViewStyle>;
    contentContainerStyle?: StyleProp<ViewStyle>;
    horizontal?: boolean;
    numColumns?: number;
    showsHorizontalScrollIndicator?: boolean;
    showsVerticalScrollIndicator?: boolean;
    onEndReached?: (info: { distanceFromEnd: number }) => void;
    onEndReachedThreshold?: number;
    ListHeaderComponent?: any;
    ListFooterComponent?: any;
    ListEmptyComponent?: any;
    ItemSeparatorComponent?: any;
    initialNumToRender?: number;
    maxToRenderPerBatch?: number;
    windowSize?: number;
    getItemLayout?: (data: any, index: number) => { length: number; offset: number; index: number };
    refreshing?: boolean;
    onRefresh?: () => void;
    scrollEnabled?: boolean;
    bounces?: boolean;
    onScroll?: (...args: any[]) => void;
    scrollEventThrottle?: number;
    ref?: any;
    testID?: string;
    [key: string]: any;
  }

  export interface TextInputProps extends ViewProps {
    value?: string;
    defaultValue?: string;
    onChangeText?: (text: string) => void;
    onChange?: (...args: any[]) => void;
    onSubmitEditing?: (...args: any[]) => void;
    onFocus?: (...args: any[]) => void;
    onBlur?: (...args: any[]) => void;
    placeholder?: string;
    placeholderTextColor?: string;
    editable?: boolean;
    multiline?: boolean;
    numberOfLines?: number;
    maxLength?: number;
    secureTextEntry?: boolean;
    keyboardType?: string;
    returnKeyType?: string;
    autoCapitalize?: string;
    autoCorrect?: boolean;
    autoFocus?: boolean;
    selectTextOnFocus?: boolean;
    textContentType?: string;
    autoComplete?: string;
    style?: StyleProp<TextStyle>;
    ref?: any;
  }

  export interface ModalProps {
    visible?: boolean;
    animationType?: 'none' | 'slide' | 'fade';
    transparent?: boolean;
    onRequestClose?: () => void;
    onShow?: () => void;
    onDismiss?: () => void;
    presentationStyle?: string;
    children?: ReactNode;
    statusBarTranslucent?: boolean;
    style?: StyleProp<ViewStyle>;
    supportedOrientations?: string[];
    [key: string]: any;
  }

  export interface ImageBackgroundProps extends ImageProps {
    children?: ReactNode;
    imageStyle?: StyleProp<ImageStyle>;
    imageRef?: any;
  }

  export interface TouchableOpacityProps extends ViewProps {
    onPress?: (...args: any[]) => void;
    onLongPress?: (...args: any[]) => void;
    activeOpacity?: number;
    disabled?: boolean;
    delayLongPress?: number;
    delayPressIn?: number;
    delayPressOut?: number;
    hitSlop?: any;
  }

  export interface TouchableWithoutFeedbackProps {
    onPress?: (...args: any[]) => void;
    onLongPress?: (...args: any[]) => void;
    onPressIn?: (...args: any[]) => void;
    onPressOut?: (...args: any[]) => void;
    disabled?: boolean;
    children?: ReactNode;
    testID?: string;
    accessible?: boolean;
    accessibilityLabel?: string;
    hitSlop?: any;
    style?: StyleProp<ViewStyle>;
  }

  // ─── Core Components ────────────────────────────────────

  export const View: ComponentType<ViewProps>;
  export const Text: ComponentType<TextProps>;
  export const Pressable: ComponentType<PressableProps>;
  export const ScrollView: ComponentType<ScrollViewProps>;
  export const Image: ComponentType<ImageProps>;
  export const TextInput: ComponentType<TextInputProps>;
  export const Modal: ComponentType<ModalProps>;
  export const ImageBackground: ComponentType<ImageBackgroundProps>;
  export const TouchableOpacity: ComponentType<TouchableOpacityProps>;
  export const TouchableWithoutFeedback: ComponentType<TouchableWithoutFeedbackProps>;
  export const StatusBar: ComponentType<Record<string, any>>;
  export const ActivityIndicator: ComponentType<Record<string, any>>;
  export const Switch: ComponentType<Record<string, any>>;
  export const SafeAreaView: ComponentType<ViewProps>;
  export const KeyboardAvoidingView: ComponentType<ViewProps & { behavior?: string; keyboardVerticalOffset?: number }>;
  export const RefreshControl: ComponentType<{
    refreshing: boolean;
    onRefresh?: () => void;
    colors?: string[];
    tintColor?: string;
    title?: string;
    titleColor?: string;
    [key: string]: any;
  }>;

  export class FlatList<T = any> extends React.Component<FlatListProps<T>> {
    scrollToEnd(params?: { animated?: boolean }): void;
    scrollToIndex(params: { animated?: boolean; index: number; viewOffset?: number; viewPosition?: number }): void;
    scrollToItem(params: { animated?: boolean; item: T; viewPosition?: number }): void;
    scrollToOffset(params: { animated?: boolean; offset: number }): void;
  }

  // ─── TVFocusGuideView (no-op on web) ───────────────────

  export const TVFocusGuideView: ComponentType<ViewProps & {
    destinations?: any[];
    autoFocus?: boolean;
  }>;

  // ─── Platform ───────────────────────────────────────────

  export interface PlatformStatic {
    OS: 'ios' | 'android' | 'web' | 'windows' | 'macos' | 'tvos';
    Version: number | string;
    isTV: boolean;
    isTesting: boolean;
    select<T>(specifics: { ios?: T; android?: T; web?: T; default?: T; [key: string]: T | undefined }): T;
  }

  export const Platform: PlatformStatic;

  // ─── Dimensions ─────────────────────────────────────────

  export interface ScaledSize {
    width: number;
    height: number;
    scale: number;
    fontScale: number;
  }

  export const Dimensions: {
    get(dim: 'window' | 'screen'): ScaledSize;
    addEventListener(type: 'change', handler: (result: { window: ScaledSize; screen: ScaledSize }) => void): { remove: () => void };
    removeEventListener(type: 'change', handler: (...args: any[]) => void): void;
    set(dims: Record<string, any>): void;
  };

  export function useWindowDimensions(): ScaledSize;

  // ─── Linking ────────────────────────────────────────────

  export const Linking: {
    openURL(url: string): Promise<void>;
    canOpenURL(url: string): Promise<boolean>;
    getInitialURL(): Promise<string | null>;
    addEventListener(type: string, handler: (event: { url: string }) => void): { remove: () => void };
  };

  // ─── I18nManager ────────────────────────────────────────

  export const I18nManager: {
    isRTL: boolean;
    doLeftAndRightSwapInRTL: boolean;
    allowRTL(allowRTL: boolean): void;
    forceRTL(forceRTL: boolean): void;
    swapLeftAndRightInRTL(flipStyles: boolean): void;
  };

  // ─── AccessibilityInfo ──────────────────────────────────

  export const AccessibilityInfo: {
    isBoldTextEnabled(): Promise<boolean>;
    isGrayscaleEnabled(): Promise<boolean>;
    isInvertColorsEnabled(): Promise<boolean>;
    isReduceMotionEnabled(): Promise<boolean>;
    isReduceTransparencyEnabled(): Promise<boolean>;
    isScreenReaderEnabled(): Promise<boolean>;
    addEventListener(eventName: string, handler: (...args: any[]) => void): { remove: () => void };
    setAccessibilityFocus(reactTag: number): void;
    announceForAccessibility(announcement: string): void;
  };

  // ─── BackHandler ────────────────────────────────────────

  export const BackHandler: {
    exitApp(): void;
    addEventListener(eventName: 'hardwareBackPress', handler: () => boolean | null | undefined): { remove: () => void };
    removeEventListener(eventName: 'hardwareBackPress', handler: () => boolean | null | undefined): void;
  };

  // ─── PixelRatio ─────────────────────────────────────────

  export const PixelRatio: {
    get(): number;
    getFontScale(): number;
    getPixelSizeForLayoutSize(layoutSize: number): number;
    roundToNearestPixel(layoutSize: number): number;
  };

  // ─── Vibration ──────────────────────────────────────────

  export const Vibration: {
    vibrate(pattern?: number | number[], repeat?: boolean): void;
    cancel(): void;
  };

  // ─── NativeModules / NativeEventEmitter ─────────────────

  export const NativeModules: Record<string, any>;

  export class NativeEventEmitter {
    constructor(nativeModule?: any);
    addListener(eventType: string, listener: (...args: any[]) => void, context?: any): { remove: () => void };
    removeAllListeners(eventType: string): void;
    removeSubscription(subscription: { remove: () => void }): void;
    listenerCount(eventType: string): number;
    emit(eventType: string, ...params: any[]): void;
  }

  // ─── Animated ───────────────────────────────────────────

  export namespace Animated {
    class Value {
      constructor(value: number);
      setValue(value: number): void;
      setOffset(offset: number): void;
      flattenOffset(): void;
      extractOffset(): void;
      addListener(callback: (state: { value: number }) => void): string;
      removeListener(id: string): void;
      removeAllListeners(): void;
      stopAnimation(callback?: (value: number) => void): void;
      resetAnimation(callback?: (value: number) => void): void;
      interpolate(config: InterpolationConfigType): AnimatedInterpolation;
    }

    class ValueXY {
      x: Value;
      y: Value;
      constructor(valueIn?: { x: number | Value; y: number | Value });
      setValue(value: { x: number; y: number }): void;
      setOffset(offset: { x: number; y: number }): void;
      flattenOffset(): void;
      extractOffset(): void;
      stopAnimation(callback?: (value: { x: number; y: number }) => void): void;
      resetAnimation(callback?: (value: { x: number; y: number }) => void): void;
      addListener(callback: (value: { x: number; y: number }) => void): string;
      removeListener(id: string): void;
      removeAllListeners(): void;
      getLayout(): { left: Value; top: Value };
      getTranslateTransform(): [{ translateX: Value }, { translateY: Value }];
    }

    type AnimatedInterpolation = Value & {
      interpolate(config: InterpolationConfigType): AnimatedInterpolation;
    };

    interface InterpolationConfigType {
      inputRange: number[];
      outputRange: number[] | string[];
      easing?: (input: number) => number;
      extrapolate?: 'extend' | 'identity' | 'clamp';
      extrapolateLeft?: 'extend' | 'identity' | 'clamp';
      extrapolateRight?: 'extend' | 'identity' | 'clamp';
    }

    interface AnimationConfig {
      isInteraction?: boolean;
      useNativeDriver: boolean;
    }

    interface TimingAnimationConfig extends AnimationConfig {
      toValue: number | Value | ValueXY | { x: number; y: number } | AnimatedInterpolation;
      duration?: number;
      easing?: (value: number) => number;
      delay?: number;
    }

    interface SpringAnimationConfig extends AnimationConfig {
      toValue: number | Value | ValueXY | { x: number; y: number };
      overshootClamping?: boolean;
      restDisplacementThreshold?: number;
      restSpeedThreshold?: number;
      velocity?: number | { x: number; y: number };
      bounciness?: number;
      speed?: number;
      tension?: number;
      friction?: number;
      stiffness?: number;
      damping?: number;
      mass?: number;
      delay?: number;
    }

    interface DecayAnimationConfig extends AnimationConfig {
      velocity: number | { x: number; y: number };
      deceleration?: number;
    }

    type CompositeAnimation = {
      start(callback?: (result: { finished: boolean }) => void): void;
      stop(): void;
      reset(): void;
    };

    function timing(value: Value | ValueXY, config: TimingAnimationConfig): CompositeAnimation;
    function spring(value: Value | ValueXY, config: SpringAnimationConfig): CompositeAnimation;
    function decay(value: Value | ValueXY, config: DecayAnimationConfig): CompositeAnimation;
    function parallel(animations: CompositeAnimation[], config?: { stopTogether?: boolean }): CompositeAnimation;
    function sequence(animations: CompositeAnimation[]): CompositeAnimation;
    function stagger(time: number, animations: CompositeAnimation[]): CompositeAnimation;
    function loop(animation: CompositeAnimation, config?: { iterations?: number; resetBeforeIteration?: boolean }): CompositeAnimation;
    function delay(time: number): CompositeAnimation;

    function event<T>(argMapping: Array<Record<string, any> | null>, config?: { listener?: (event: T) => void; useNativeDriver: boolean }): (...args: any[]) => void;

    const View: ComponentType<any>;
    const Text: ComponentType<any>;
    const Image: ComponentType<any>;
    const ScrollView: ComponentType<any>;
    const FlatList: ComponentType<any>;

    function createAnimatedComponent<T extends ComponentType<any>>(component: T): T;

    function add(a: Value, b: Value): Value;
    function subtract(a: Value, b: Value): Value;
    function multiply(a: Value, b: Value): Value;
    function divide(a: Value, b: Value): Value;
    function modulo(a: Value, modulus: number): Value;
    function diffClamp(a: Value, min: number, max: number): Value;
  }

  // ─── Easing ─────────────────────────────────────────────

  export const Easing: {
    step0: (n: number) => number;
    step1: (n: number) => number;
    linear: (t: number) => number;
    ease: (t: number) => number;
    quad: (t: number) => number;
    cubic: (t: number) => number;
    poly: (n: number) => (t: number) => number;
    sin: (t: number) => number;
    sine: (t: number) => number;
    circle: (t: number) => number;
    exp: (t: number) => number;
    elastic: (bounciness?: number) => (t: number) => number;
    back: (s?: number) => (t: number) => number;
    bounce: (t: number) => number;
    bezier: (x1: number, y1: number, x2: number, y2: number) => (t: number) => number;
    in: (easing: (t: number) => number) => (t: number) => number;
    out: (easing: (t: number) => number) => (t: number) => number;
    inOut: (easing: (t: number) => number) => (t: number) => number;
  };

  // ─── PanResponder ───────────────────────────────────────

  export interface PanResponderGestureState {
    stateID: number;
    moveX: number;
    moveY: number;
    x0: number;
    y0: number;
    dx: number;
    dy: number;
    vx: number;
    vy: number;
    numberActiveTouches: number;
  }

  export const PanResponder: {
    create(config: Record<string, any>): {
      panHandlers: Record<string, any>;
    };
  };

  // ─── Utility Functions ──────────────────────────────────

  export function findNodeHandle(componentOrHandle: any): number | null;
  export function requireNativeComponent(viewName: string): ComponentType<any>;

  // ─── AppState ───────────────────────────────────────────

  export const AppState: {
    currentState: 'active' | 'background' | 'inactive' | 'unknown' | 'extension';
    addEventListener(type: string, handler: (state: string) => void): { remove: () => void };
    removeEventListener(type: string, handler: (state: string) => void): void;
  };

  // ─── Alert ──────────────────────────────────────────────

  export const Alert: {
    alert(title: string, message?: string, buttons?: Array<{ text?: string; onPress?: () => void; style?: string }>, options?: Record<string, any>): void;
  };

  // ─── Clipboard ──────────────────────────────────────────

  export const Clipboard: {
    getString(): Promise<string>;
    setString(content: string): void;
  };

  // ─── Share ──────────────────────────────────────────────

  export const Share: {
    share(content: { message?: string; url?: string; title?: string }, options?: Record<string, any>): Promise<{ action: string; activityType?: string }>;
  };

  // ─── React import for class usage ──────────────────────

  import React from 'react';
}

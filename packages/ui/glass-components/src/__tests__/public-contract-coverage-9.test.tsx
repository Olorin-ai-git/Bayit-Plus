import React from 'react';
import { act, fireEvent, render, renderHook } from '@testing-library/react-native';
import { AccessibilityInfo, I18nManager, PanResponder, Platform, Text } from 'react-native';
import {
  GlassAnalogClock,
  GlassAvatar,
  GlassBadge,
  GlassBreadcrumbs,
  GlassButton,
  GlassCard,
  GlassCarousel3D,
  GlassCategoryPill,
  GlassCheckbox,
  GlassChevron,
  GlassDraggableExpander,
  GlassErrorBanner,
  GlassFAB,
  GlassInput,
  GlassLiveChannelCard,
  GlassLocationConsentModal,
  GlassModal,
  GlassPlaceholder,
  GlassPosterCard,
  GlassProgressBar,
  GlassRadar,
  GlassReorderableList,
  GlassResizablePanel,
  GlassSectionItem,
  GlassSelect,
  GlassSplitterHandle,
  GlassStatCard,
  GlassTabContainer,
  GlassTable,
  GlassTableCell,
  GlassTabs,
  GlassTextarea,
  GlassToast,
  GlassToastContainer,
  GlassToggle,
  GlassTooltip,
  GlassTVSwitch,
  GlassView,
  useGlassTheme,
  useNotifications,
  useRadarAnimation,
  useSpringAnimation,
  useTVFocus,
} from '../native';
import { useNotificationStore } from '../stores/notificationStore';
import { alertCompat, AlertCompat } from '../compat/AlertCompat';
import { GlassModalCompat } from '../compat/GlassModalCompat';
import { Notifications } from '../hooks/useNotifications';
import {
  getActionHint,
  getLevelLabel,
  getLiveRegionPriority,
  announceToScreenReader,
  isScreenReaderEnabled,
} from '../native/components/GlassToast/accessibility';
import { useSwipeAnimation, useToastAnimation } from '../native/components/GlassToast/animations';
import { getContainerWidth, getSwipeThreshold } from '../native/components/GlassToast/styles';
import { arcPath, polarToCartesian, valueToAngle } from '../native/components/GlassGauge/utils';
import { formatLatency, getSizeConfig, getStatusColor } from '../native/components/GlassHeartbeat/utils';
import { calculateScanAngle, isAnomalyInScanningRange, polarToCartesian as radarPolarToCartesian } from '../native/components/GlassRadar/utils';
import { performanceMonitor, withPerformanceTracking } from '../utils/performance';
import {
  announceNotification,
  clearTTSQueue,
  initNotificationTTS,
  ttsAnnouncementQueue,
} from '../utils/tts';
import type { Notification } from '../native/components/GlassToast/types';
import * as webExports from '../web';
import * as hookExports from '../hooks';
import * as storeExports from '../stores';
import * as contextExports from '../contexts';
import * as compatExports from '../compat';
import { colors } from '../theme';

const icon = <Text>icon</Text>;

describe('public component contracts', () => {
  beforeEach(() => {
    useNotificationStore.getState().clear();
    performanceMonitor.clear();
    clearTTSQueue();
    jest.useRealTimers();
  });

  it('covers toast accessibility and animation helpers', async () => {
    jest.useFakeTimers();
    expect(getLevelLabel('error')).toBe('Error');
    expect(getLiveRegionPriority('warning')).toBe('assertive');
    expect(getLiveRegionPriority('info')).toBe('polite');
    expect(getActionHint('retry')).toBe('Double tap to retry');
    announceToScreenReader('Message', 'Title', 'success');
    expect(document.body.querySelector('[aria-live="polite"]')).toBeTruthy();
    act(() => jest.runAllTimers());
    expect(await isScreenReaderEnabled()).toBe(false);
    expect(getContainerWidth()).toBe(400);
    expect(getContainerWidth(true)).toBe(500);
    expect(getSwipeThreshold()).toBe(80);

    const dismiss = jest.fn();
    const toastHook = renderHook(({ visible }) => useToastAnimation(visible, dismiss), { initialProps: { visible: true } });
    toastHook.rerender({ visible: false });
    const swipe = renderHook(() => useSwipeAnimation(toastHook.result.current.slideAnim, toastHook.result.current.opacityAnim, 20));
    act(() => {
      swipe.result.current.onSwipeUpdate(10);
      swipe.result.current.onSwipeUpdate(-10);
      swipe.result.current.onSwipeEnd(30, 0, dismiss);
      swipe.result.current.onSwipeEnd(0, 0, dismiss);
    });

    const originalRTL = I18nManager.isRTL;
    I18nManager.isRTL = true;
    try {
      const reduced = renderHook(({ visible }) => useToastAnimation(visible, dismiss, true), { initialProps: { visible: true } });
      reduced.rerender({ visible: false });
      const rtlSwipe = renderHook(() => useSwipeAnimation(reduced.result.current.slideAnim, reduced.result.current.opacityAnim));
      act(() => {
        rtlSwipe.result.current.onSwipeUpdate(-25);
        rtlSwipe.result.current.onSwipeUpdate(25);
        rtlSwipe.result.current.onSwipeEnd(-1, -600, dismiss);
      });
    } finally {
      I18nManager.isRTL = originalRTL;
    }
  });

  it('covers toast rendering and notification containers', () => {
    const dismiss = jest.fn();
    const base: Notification = { id: 'toast', level: 'warning', title: 'Warning', message: 'Message', createdAt: 1, priority: 2, dismissable: true, action: { label: 'Retry', type: 'action', onPress: jest.fn() } };
    const toast = render(<GlassToast notification={base} onDismiss={dismiss} />);
    fireEvent.press(toast.getByText('Retry'));
    for (const button of toast.container.querySelectorAll('touchableopacity')) fireEvent.press(button);

    useNotificationStore.getState().add({ level: 'info', message: 'First' });
    useNotificationStore.getState().add({ level: 'error', message: 'Second' });
    render(<GlassToastContainer position="top" maxVisible={1} />);
    render(<GlassToastContainer position="bottom" maxVisible={2} />);
    render(<GlassToast notification={{ ...base, id: 'plain', level: 'info', title: undefined, action: undefined, dismissable: false }} onDismiss={dismiss} />);
    jest.useFakeTimers();
    render(<GlassToast notification={{ ...base, id: 'timed', level: 'success', duration: 10 }} onDismiss={dismiss} />);
    act(() => jest.advanceTimersByTime(10));

    const globalState = global as typeof globalThis & { __mockSafeAreaInsets?: { top: number; bottom: number; left: number; right: number } };
    const originalOS = Platform.OS;
    Platform.OS = 'ios';
    globalState.__mockSafeAreaInsets = { top: 60, bottom: 20, left: 0, right: 0 };
    try {
      render(<GlassToastContainer position="top" />);
    } finally {
      Platform.OS = originalOS;
      delete globalState.__mockSafeAreaInsets;
    }
  });

  it('covers compatibility APIs', () => {
    const show = jest.spyOn(Notifications, 'show');
    const onPress = jest.fn();
    alertCompat('Error', 'Failed', [{ text: 'Retry', onPress }], { cancelable: false });
    AlertCompat.alert('Warning', 'Caution');
    alertCompat('Success complete');
    alertCompat('Information');
    expect(show).toHaveBeenCalledTimes(4);
    show.mockRestore();

    jest.useFakeTimers();
    render(<GlassModalCompat visible type="error" title="Error" message="Failure" onClose={onPress} />);
    render(<GlassModalCompat visible type="success" message="Complete" />);
    render(<GlassModalCompat visible={false} message="Hidden" />);
    act(() => jest.runAllTimers());
    expect(onPress).toHaveBeenCalled();
  });
});

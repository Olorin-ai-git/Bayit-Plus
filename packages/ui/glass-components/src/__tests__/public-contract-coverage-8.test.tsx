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

  it('covers theme and focus hook states', () => {
    const theme = renderHook(() => useGlassTheme()).result.current;
    expect(theme.colors).toBeDefined();

    for (const styleType of ['card', 'button', 'input', 'outline', 'none'] as const) {
      const callbacks = { onFocus: jest.fn(), onBlur: jest.fn() };
      const hook = renderHook(() => useTVFocus({ styleType, ...callbacks }));
      act(() => hook.result.current.handleFocus());
      expect(hook.result.current.isFocused).toBe(true);
      act(() => hook.result.current.handleBlur());
      expect(callbacks.onFocus).toHaveBeenCalled();
      expect(callbacks.onBlur).toHaveBeenCalled();
      hook.unmount();
    }
    expect(renderHook(() => useTVFocus({ tvOnly: true, animated: false })).result.current.isFocused).toBe(false);
  });

  it('loads every public package entry point', () => {
    expect(webExports.GlassButton).toBe(GlassButton);
    expect(hookExports.useGlassTheme).toBe(useGlassTheme);
    expect(storeExports.useNotificationStore).toBe(useNotificationStore);
    expect(contextExports.NotificationProvider).toBeDefined();
    expect(compatExports.AlertCompat).toBe(AlertCompat);
  });

  it('covers notification hook sanitization and imperative methods', () => {
    const hook = renderHook(() => useNotifications());
    act(() => {
      hook.result.current.showWithI18n({ level: 'info', message: '<b>Hello</b>', title: 'Title' });
      hook.result.current.showWithI18n({ level: 'warning' });
      hook.result.current.dismiss('missing');
      hook.result.current.clearByLevel('warning');
      Notifications.showDebug('Debug');
      Notifications.showInfo('Info');
      Notifications.showWarning('Warning');
      Notifications.showSuccess('Success');
      Notifications.showError('Error');
      Notifications.dismiss('missing');
      Notifications.clearByLevel('debug');
      Notifications.clear();
    });
  });

  it('advances radar and spring animation hooks', () => {
    let frameCallback: FrameRequestCallback | undefined;
    const request = jest.spyOn(global, 'requestAnimationFrame').mockImplementation((callback) => {
      frameCallback = callback;
      return 1;
    });
    const cancel = jest.spyOn(global, 'cancelAnimationFrame').mockImplementation();
    const now = jest.spyOn(Date, 'now').mockReturnValue(1000);
    const radar = renderHook(() => useRadarAnimation({ isScanning: true, scanDuration: 1000 }));
    now.mockReturnValue(1001);
    act(() => frameCallback?.(1001));
    now.mockReturnValue(1100);
    act(() => frameCallback?.(1100));
    expect(radar.result.current.isAnimating).toBe(true);
    expect(radar.result.current.isAnomalyGlowing(radar.result.current.scanAngle)).toBe(true);
    radar.unmount();

    const spring = renderHook(({ target }) => useSpringAnimation(target, { stiffness: 100, damping: 10, mass: 1 }), { initialProps: { target: 10 } });
    act(() => frameCallback?.(1116));
    spring.rerender({ target: 20 });
    spring.unmount();
    request.mockRestore();
    cancel.mockRestore();
    now.mockRestore();
  });

  it('covers visualization utility boundaries', () => {
    expect(valueToAngle(-1, 100, -120, 120)).toBe(-120);
    expect(valueToAngle(200, 100, -120, 120)).toBe(120);
    expect(valueToAngle(50, 0, -120, 120)).toBe(-120);
    expect(polarToCartesian(10, 10, 5, 0)).toEqual({ x: 10, y: 5 });
    expect(arcPath(10, 10, 5, 0, 180)).toContain('A 5 5');
    expect(getStatusColor('offline')).toBeTruthy();
    expect(getStatusColor('unknown' as never)).toBeTruthy();
    expect(getSizeConfig('sm').dotSize).toBe(8);
    expect(getSizeConfig('lg').dotSize).toBe(16);
    expect(getSizeConfig('unknown' as never).dotSize).toBe(12);
    expect(formatLatency(0)).toBe('<1ms');
    expect(radarPolarToCartesian(100, 100, 50, Math.PI / 2).x).toBeCloseTo(100);
    expect(calculateScanAngle(500, 1000)).toBeCloseTo(Math.PI);
    expect(isAnomalyInScanningRange(0.1, 0, 0.2)).toBe(true);
    expect(isAnomalyInScanningRange(1, 0, 0.2)).toBe(false);
  });
});

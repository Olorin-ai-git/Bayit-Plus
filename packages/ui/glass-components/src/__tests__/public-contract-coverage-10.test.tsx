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

  it('records performance metrics and tracked component lifecycles', () => {
    const now = jest.spyOn(performance, 'now').mockReturnValueOnce(0).mockReturnValueOnce(20).mockReturnValueOnce(25).mockReturnValueOnce(30);
    const end = performanceMonitor.startMeasure('Direct');
    end();
    expect(performanceMonitor.getMetrics()).toHaveLength(1);
    expect(performanceMonitor.getAverageRenderTime('Direct')).toBe(20);
    expect(performanceMonitor.getMaxRenderTime('Direct')).toBe(20);
    expect(performanceMonitor.getAverageRenderTime('Missing')).toBe(0);
    expect(performanceMonitor.getMaxRenderTime('Missing')).toBe(0);
    for (let index = 0; index < 101; index += 1) performanceMonitor.startMeasure('Trimmed')();
    expect(performanceMonitor.getMetrics('Trimmed')).toHaveLength(100);
    const Tracked = withPerformanceTracking(({ name }: { name: string }) => <Text>{name}</Text>, 'Tracked');
    expect(Tracked.displayName).toBe('withPerformanceTracking(Tracked)');
    render(<Tracked name="Component" />).unmount();
    now.mockRestore();
  });

  it('announces notifications through configured TTS services', async () => {
    jest.useFakeTimers();
    const service = { speak: jest.fn().mockResolvedValue(undefined) };
    const ducking = { duck: jest.fn().mockResolvedValue(undefined), restore: jest.fn().mockResolvedValue(undefined) };
    initNotificationTTS(service, ducking);
    await announceNotification({ id: 'tts', level: 'error', title: 'Error', message: '<b>Failure</b>', createdAt: 1, priority: 3 });
    expect(service.speak).toHaveBeenCalledWith('Error. Failure', { priority: 'high', interruptible: false });
    expect(ducking.duck).toHaveBeenCalled();
    expect(ducking.restore).toHaveBeenCalled();
    await announceNotification({ id: 'debug', level: 'debug', message: 'Hidden', createdAt: 2, priority: 0 });
    ttsAnnouncementQueue.clearById('missing');
    act(() => jest.runOnlyPendingTimers());
    initNotificationTTS(null);
    clearTTSQueue();
  });

  it('handles TTS failures and screen-reader query failures', async () => {
    const error = jest.spyOn(console, 'error').mockImplementation();
    const service = { speak: jest.fn().mockRejectedValue(new Error('speak failed')) };
    initNotificationTTS(service);
    await announceNotification({ id: 'failed-tts', level: 'info', message: 'Failure', createdAt: 1, priority: 1 });
    expect(error).toHaveBeenCalled();
    error.mockRestore();

    const originalOS = Platform.OS;
    Platform.OS = 'ios';
    (AccessibilityInfo.isScreenReaderEnabled as jest.Mock).mockRejectedValueOnce(new Error('query failed'));
    try {
      expect(await isScreenReaderEnabled()).toBe(false);
    } finally {
      Platform.OS = originalOS;
    }
  });
});

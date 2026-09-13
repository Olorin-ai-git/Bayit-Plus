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

  it('drives carousel gesture, pagination, autoplay, and empty states', () => {
    jest.useFakeTimers();
    const indexChange = jest.fn();
    const carousel = render(<GlassCarousel3D autoPlayInterval={100} onIndexChange={indexChange} onItemPress={indexChange}>{[<Text key="a">A</Text>, <Text key="b">B</Text>, <Text key="c">C</Text>]}</GlassCarousel3D>);
    act(() => jest.advanceTimersByTime(100));
    expect(indexChange).toHaveBeenCalled();

    const panConfig = (PanResponder.create as jest.Mock).mock.calls.at(-1)?.[0];
    expect(panConfig.onStartShouldSetPanResponder()).toBe(true);
    expect(panConfig.onMoveShouldSetPanResponder({}, { dx: 11 })).toBe(true);
    act(() => panConfig.onPanResponderGrant());
    act(() => panConfig.onPanResponderMove({}, { dx: -100 }));
    act(() => panConfig.onPanResponderRelease({}, { dx: -100, vx: -1 }));
    act(() => panConfig.onPanResponderTerminate());

    for (const pressable of carousel.container.querySelectorAll('pressable')) fireEvent.press(pressable);
    expect(render(<GlassCarousel3D>{[]}</GlassCarousel3D>).container.firstChild).toBeTruthy();
    carousel.unmount();
  });

  it('covers remaining progress, placeholder, table-cell, and section variants', () => {
    for (const size of ['sm', 'md', 'lg'] as const) {
      for (const variant of ['default', 'gradient', 'success', 'warning'] as const) {
        render(<GlassProgressBar progress={33} size={size} variant={variant} showLabel animated={variant !== 'gradient'} isRTL={size === 'sm'} />);
      }
    }
    render(<GlassProgressBar progress={0} total={0} current={0} showSegments showLabel />);

    for (const contentReason of ['loading', 'missing', 'unavailable'] as const) {
      render(<GlassPlaceholder contentType="movie" width={100} height={100} accessibilityRole="image" accessibilityLabel="Poster" contentTitle="Title" contentReason={contentReason} />);
    }
    render(<GlassPlaceholder contentType="series" width={100} height={100} aspectRatio={2} accessibilityRole="none" accessibilityLabel="Series" />);

    for (const variant of ['success', 'warning', 'error', 'default'] as const) render(<GlassTableCell.Badge variant={variant}>{variant}</GlassTableCell.Badge>);
    render(<GlassTableCell.TwoLine primary="Only" />);
    render(<GlassTableCell.Text muted>Muted</GlassTableCell.Text>);
    render(<GlassTableCell.ActionButton icon={icon} onPress={jest.fn()} variant="danger" disabled />);

    const action = jest.fn();
    const section = render(<GlassSectionItem icon="*" label="Actions" visible onMoveUp={action} onMoveDown={action} onToggleVisibility={action} testID="actions-section" />);
    for (const control of section.container.querySelectorAll('touchableopacity')) fireEvent.press(control);
  });

  it('covers mobile dimensions, defensive palette fallbacks, and empty form states', () => {
    const globalState = global as typeof globalThis & { __mockWindowWidth?: number };
    globalState.__mockWindowWidth = 375;
    try {
      render(<GlassButton title="Mobile" size="md" />);
      render(<GlassInput testID="mobile-input" />);
      render(<GlassSelect options={[]} testID="mobile-select" />);
    } finally {
      delete globalState.__mockWindowWidth;
    }

    const mutableColors = colors as Record<string, string | undefined>;
    const fallbackKeys = ['primary700', 'primary800', 'glassPurpleStrong', 'glassLight', 'glassBorder', 'error', 'success', 'warning', 'info', 'text', 'primaryLight'];
    const originals = Object.fromEntries(fallbackKeys.map((key) => [key, mutableColors[key]]));
    try {
      for (const key of fallbackKeys) mutableColors[key] = undefined;
      for (const variant of ['primary', 'secondary', 'ghost', 'danger', 'destructive', 'outline', 'success', 'warning', 'cancel', 'info'] as const) {
        render(<GlassButton title={`fallback-${variant}`} variant={variant} />);
      }
    } finally {
      Object.assign(mutableColors, originals);
    }

    render(<GlassBadge variant={'invalid' as never} size={'invalid' as never}>Fallback badge</GlassBadge>);
    const noLabelCheckbox = render(<GlassCheckbox disabled testID="no-label-checkbox" />);
    const checkboxControl = noLabelCheckbox.container.querySelector('touchableopacity');
    fireEvent.focus(checkboxControl);
    fireEvent.blur(checkboxControl);
    fireEvent.press(checkboxControl);
    render(<GlassTextarea hint="Hint only" />);
    render(<GlassInput />);

    const selected = render(<GlassSelect options={[{ label: 'Selected', value: 'selected' }, { label: 'Disabled', value: 'disabled', disabled: true }]} value="selected" testID="selected-select" />);
    fireEvent.press(selected.getAllByText('Selected')[0]);
    fireEvent.press(selected.getByText('Disabled'));
  });

  it('covers radar severity, callback, and scan-state branches', () => {
    const onSelect = jest.fn();
    const anomalies = [
      { id: 'critical', name: 'Critical', severity: 'critical' as const, position: { x: 50, y: 50 } },
      { id: 'high', name: 'High', severity: 'high' as const, position: { x: 60, y: 60 } },
      { id: 'medium', name: 'Medium', severity: 'medium' as const, position: { x: 70, y: 70 } },
      { id: 'low', name: 'Low', severity: 'low' as const, position: { x: 80, y: 80 } },
    ];
    const radar = render(<GlassRadar agents={[{ id: 'agent', name: 'Agent', radius: 25 }]} anomalies={anomalies} uiState={{ isScanning: true, showLabels: true }} onAnomalySelected={onSelect} size={200} testID="severity-radar" />);
    const circles = radar.container.querySelectorAll('circle');
    fireEvent.press(circles[2]);
    expect(onSelect).toHaveBeenCalled();
    render(<GlassRadar agents={[{ id: 'default-color', name: 'Default', radius: 10 }]} anomalies={[]} />);
  });
});

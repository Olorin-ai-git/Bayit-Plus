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

  it('renders presentational variants and optional content', () => {
    const views = [
      <GlassAnalogClock key="clock" hours={13} minutes={30} label="Clock" flag="Flag" sublabel="Local" isShabbat testID="clock" />,
      <GlassAvatar key="avatar-image" uri="https://example.test/avatar.png" name="Ada" size="small" showOnlineStatus isOnline testID="avatar-image" />,
      <GlassAvatar key="avatar-name" name="Ada" size="large" showOnlineStatus testID="avatar-name" />,
      <GlassAvatar key="avatar-fallback" fallbackIcon={icon} size="xlarge" showEditButton editIcon={icon} onEditPress={jest.fn()} testID="avatar-fallback" />,
      <GlassBadge key="badge" variant="success" size="lg" dot dotColor="danger" icon={icon} testID="badge">Ready</GlassBadge>,
      <GlassCard key="card" title="Card" subtitle="Subtitle" imageUrl="https://example.test/card.png" badge="New" showPlayIcon progress={50} testID="card">Body</GlassCard>,
      <GlassErrorBanner key="error" message="Failure" onDismiss={jest.fn()} />,
      <GlassStatCard key="stat" icon={icon} label="Jobs" value={4} subtitle="Today" compact testID="stat" />,
      <GlassTooltip key="tooltip" content="Details" position="bottom" testID="tooltip"><Text>Target</Text></GlassTooltip>,
    ];

    for (const view of views) {
      const result = render(view);
      expect(result.container.firstChild).toBeTruthy();
      result.unmount();
    }

    expect(render(<GlassErrorBanner message={null} onDismiss={jest.fn()} />).container.firstChild).toBeNull();
  });

  it('covers view, badge, avatar, and card branches', () => {
    const intensities = ['subtle', 'low', 'medium', 'high', 'light', 'heavy'] as const;
    for (const intensity of intensities) {
      const result = render(<GlassView intensity={intensity} borderColor="#fff" noBorder={intensity === 'heavy'}><Text>{intensity}</Text></GlassView>);
      expect(result.getByText(intensity)).toBeTruthy();
      result.unmount();
    }

    for (const variant of ['default', 'primary', 'success', 'danger', 'warning', 'purple'] as const) {
      const result = render(<GlassBadge variant={variant} size="sm">{variant}</GlassBadge>);
      expect(result.getByText(variant)).toBeTruthy();
      result.unmount();
    }

    expect(render(<GlassAvatar />).getByText('?')).toBeTruthy();
    expect(render(<GlassCard autoSize><Text>Auto</Text></GlassCard>).getByText('Auto')).toBeTruthy();
  });

  it('exercises button, pill, checkbox, chevron, toggle, and switch interactions', () => {
    const onPress = jest.fn();
    for (const variant of ['primary', 'secondary', 'ghost', 'danger', 'destructive', 'outline', 'success', 'warning', 'cancel', 'info'] as const) {
      const result = render(<GlassButton title={variant} variant={variant} size="sm" icon={icon} iconPosition="right" onPress={onPress} testID={`button-${variant}`} />);
      fireEvent.press(result.getByTestId(`button-${variant}`));
      result.unmount();
    }
    render(<GlassButton title="Loading" loading fullWidth testID="loading-button" />);
    render(<GlassButton title="Disabled" disabled testID="disabled-button" />);

    for (const size of ['small', 'medium', 'large'] as const) {
      const result = render(<GlassCategoryPill label={size} size={size} isActive icon={icon} emoji="!" onPress={onPress} testID={`pill-${size}`} />);
      fireEvent.press(result.getByTestId(`pill-${size}`));
      result.unmount();
    }
    render(<GlassCategoryPill label="disabled" disabled testID="disabled-pill" />);

    const checkboxChange = jest.fn();
    const checkbox = render(<GlassCheckbox label="Choice" checked error="Required" onChange={checkboxChange} isRTL testID="checkbox" />);
    fireEvent.press(checkbox.getByTestId('checkbox').querySelector('touchableopacity'));
    expect(checkboxChange).toHaveBeenCalledWith(false);

    for (const size of ['sm', 'md', 'lg'] as const) {
      const result = render(<GlassChevron expanded={size === 'lg'} size={size} onPress={onPress} testID={`chevron-${size}`} />);
      fireEvent.press(result.getByTestId(`chevron-${size}`));
      result.unmount();
    }
    render(<GlassChevron disabled isRTL testID="disabled-chevron" />);

    const toggleChange = jest.fn();
    const toggle = render(<GlassToggle value={false} onValueChange={toggleChange} label="Toggle" description="Description" isRTL testID="toggle" />);
    fireEvent.press(toggle.getByTestId('toggle'));
    expect(toggleChange).toHaveBeenCalledWith(true);
    render(<GlassToggle value onValueChange={toggleChange} disabled size="small" testID="toggle-disabled" />);

    const switchChange = jest.fn();
    const tvSwitch = render(<GlassTVSwitch value={false} onValueChange={switchChange} testID="tv-switch" />);
    fireEvent.press(tvSwitch.getByTestId('tv-switch'));
    expect(switchChange).toHaveBeenCalledWith(true);
    render(<GlassTVSwitch value onValueChange={switchChange} disabled trackColor={{ false: '#000', true: '#fff' }} thumbColor="#ccc" />);
  });
});

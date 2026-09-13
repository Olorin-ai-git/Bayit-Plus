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

  it('covers remaining optional-state and platform boundaries', () => {
    const action = jest.fn();
    const toggle = render(<GlassToggle value onValueChange={action} testID="bare-toggle" />);
    fireEvent.press(toggle.container.querySelector('pressable'));
    const disabledToggle = render(<GlassToggle value={false} onValueChange={action} disabled label="Disabled" testID="disabled-toggle" />);
    fireEvent.press(disabledToggle.getByTestId('disabled-toggle'));

    const textarea = render(<GlassTextarea label="Focused textarea" hint="Hint" testID="focused-textarea" />);
    const textareaInput = textarea.container.querySelector('input');
    fireEvent.focus(textareaInput);
    fireEvent.blur(textareaInput);

    for (const expanded of [false, true]) {
      const chevron = render(<GlassChevron expanded={expanded} onPress={action} testID={`focused-chevron-${expanded}`} />);
      const root = chevron.getByTestId(`focused-chevron-${expanded}`);
      fireEvent.focus(root);
      fireEvent.blur(root);
    }

    const singlePress = jest.fn();
    const single = render(<GlassCarousel3D onItemPress={singlePress}>{[<Text key="single">Single</Text>]}</GlassCarousel3D>);
    fireEvent.press(single.getByText('Single'));
    expect(singlePress).toHaveBeenCalledWith(0);

    const poster = render(<GlassPosterCard title="Removable" onPress={action} onRemove={action} />);
    for (const control of poster.container.querySelectorAll('pressable')) fireEvent.press(control);

    alertCompat('Error', 'Failure', [{ onPress: action }]);
    expect(isAnomalyInScanningRange(0.1, 0)).toBe(true);
    const originalOS = Platform.OS;
    const originalTV = Platform.isTV;
    Platform.OS = 'android';
    Platform.isTV = true;
    try {
      render(<GlassTVSwitch value onValueChange={action} />);
      expect(getContainerWidth()).toBe(300);
      Platform.OS = 'windows' as never;
      expect(getSwipeThreshold()).toBe(50);
    } finally {
      Platform.OS = originalOS;
      Platform.isTV = originalTV;
    }
  });

  it('covers expander gesture and nested-action handlers', () => {
    const action = jest.fn();
    const expander = render(<GlassDraggableExpander title="Gesture" defaultExpanded minHeight={100} maxHeight={300} onExpandChange={action} headerActions={<Text>Header action</Text>} rightElement={<Text>Right action</Text>} testID="gesture-expander"><Text>Content</Text></GlassDraggableExpander>);
    fireEvent.press(expander.getByText('Header action'));
    fireEvent.press(expander.getByText('Right action'));
    const panConfig = (PanResponder.create as jest.Mock).mock.calls.find(([handlers]) => handlers.onPanResponderMove && handlers.onPanResponderRelease)?.[0];
    expect(panConfig.onStartShouldSetPanResponder()).toBe(true);
    expect(panConfig.onMoveShouldSetPanResponder()).toBe(true);
    act(() => panConfig.onPanResponderMove({}, { dy: 25 }));
    act(() => panConfig.onPanResponderMove({}, { dy: -500 }));
    act(() => panConfig.onPanResponderRelease());
    fireEvent.press(expander.getByText('Gesture'));
  });

  it('executes native fallback branches without changing module scope', () => {
    const originalOS = Platform.OS;
    Platform.OS = 'ios';
    const action = jest.fn();
    try {
      for (const intensity of ['subtle', 'low', 'medium', 'high'] as const) render(<GlassView intensity={intensity} noBorder={intensity === 'medium'}><Text>{intensity}</Text></GlassView>);
      render(<GlassBreadcrumbs items={[{ label: 'Native', path: '/native' }]} onNavigate={action} testID="native-breadcrumbs" />);
      render(<GlassResizablePanel defaultCollapsed={false} onCollapseChange={action} testID="native-panel"><Text>Native panel</Text></GlassResizablePanel>);
      const splitter = render(<GlassSplitterHandle isCollapsed onToggle={action} position="left" testID="native-splitter" />);
      fireEvent.press(splitter.getByTestId('native-splitter').querySelector('pressable'));
      expect(render(<GlassTooltip content="Native"><Text>Native tooltip</Text></GlassTooltip>).getByText('Native tooltip')).toBeTruthy();
      announceToScreenReader('Native message', undefined, 'info');
      expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalled();
      expect(getContainerWidth()).toBe(300);
      expect(getSwipeThreshold()).toBe(50);
      const focus = renderHook(() => useTVFocus());
      act(() => focus.result.current.handleFocus());
      act(() => focus.result.current.handleBlur());

      const section = render(<GlassSectionItem icon="*" label="Native actions" visible onMoveUp={action} onMoveDown={action} onToggleVisibility={action} testID="native-section" />);
      const controls = section.container.querySelectorAll('touchableopacity');
      for (const control of controls) {
        fireEvent.focus(control);
        fireEvent.blur(control);
        fireEvent.press(control);
      }
    } finally {
      Platform.OS = originalOS;
    }
  });
});

describe('public utility and integration contracts', () => {
});

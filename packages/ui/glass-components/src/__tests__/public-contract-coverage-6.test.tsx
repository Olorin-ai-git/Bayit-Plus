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

  it('covers controlled tabs, missing content, defaults, and stat-card action', () => {
    const change = jest.fn();
    const tabs = [{ id: 'one', label: 'One' }, { id: 'two', label: 'Two' }];
    const controlled = render(<GlassTabContainer tabs={tabs} content={[{ tabId: 'one', render: () => <Text>One panel</Text> }]} activeTab="one" onTabChange={change} />);
    fireEvent.press(controlled.getByText('Two'));
    expect(change).toHaveBeenCalledWith('two');
    render(<GlassTabContainer tabs={[]} content={[]} />);

    const statPress = jest.fn();
    const stat = render(<GlassStatCard icon={icon} label="Clickable" value="1" onPress={statPress} testID="clickable-stat" />);
    fireEvent.press(stat.getByTestId('clickable-stat').parentElement);
    expect(statPress).toHaveBeenCalled();

    render(<GlassLocationConsentModal visible onAccept={change} onDecline={change} onClose={change} />);
  });

  it('covers splitter geometry, input focus, checkbox, and FAB size combinations', () => {
    const action = jest.fn();
    for (const position of ['left', 'right'] as const) {
      for (const isRTL of [false, true]) {
        for (const isCollapsed of [false, true]) {
          render(<GlassSplitterHandle position={position} isRTL={isRTL} isCollapsed={isCollapsed} onToggle={action} onDragStart={isCollapsed ? undefined : action} />);
        }
      }
    }

    const input = render(<GlassInput label="Focus" onFocus={action} onBlur={action} rightIcon={icon} onRightIconPress={action} testID="focus-input" />);
    const inputElement = input.container.querySelector('input');
    fireEvent.focus(inputElement);
    fireEvent.blur(inputElement);
    fireEvent.press(input.container.querySelector('pressable'));
    render(<GlassInput label="RTL" isRTL />);

    for (const checked of [false, true]) {
      const checkbox = render(<GlassCheckbox checked={checked} label={checked ? 'Checked' : undefined} error={checked ? 'Error' : undefined} onChange={action} testID={`checkbox-${checked}`} />);
      const control = checkbox.container.querySelector('touchableopacity');
      fireEvent.focus(control);
      fireEvent.blur(control);
      fireEvent.press(control);
    }

    for (const size of ['sm', 'md', 'lg'] as const) {
      render(<GlassFAB icon={icon} size={size} label={size === 'sm' ? undefined : size} onPress={action} />);
    }
  });

  it('covers section boundaries and table pagination/key branches', () => {
    const action = jest.fn();
    const sections = [
      <GlassSectionItem key="first" icon="*" label="First" visible isFirst onMoveUp={action} onMoveDown={action} onToggleVisibility={action} />,
      <GlassSectionItem key="last" icon="*" label="Last" visible isLast onMoveUp={action} onMoveDown={action} />,
      <GlassSectionItem key="hidden" icon="*" label="Hidden" visible={false} onToggleVisibility={action} showDragHandle={false} />,
      <GlassSectionItem key="rtl" icon="*" label="RTL" visible isRTL isDragging />,
    ];
    for (const section of sections) render(section);

    const columns = [{ key: 'name', label: 'Name' }, { key: 'value', label: 'Value', align: 'center' as const }];
    render(<GlassTable columns={columns} data={[{ name: '', value: '' }]} pagination={{ page: 1, pageSize: 1, total: 2 }} onPageChange={action} prevIcon={icon} nextIcon={icon} />);
    render(<GlassTable columns={columns} data={[{ name: 'Last', value: '1' }]} pagination={{ page: 2, pageSize: 1, total: 2 }} onPageChange={action} isRTL />);
    render(<GlassTable columns={columns} data={[{ name: 'Index', value: '2' }]} />);
  });
});

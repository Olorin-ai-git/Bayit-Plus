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

  it('covers table states and pagination actions', () => {
    const columns = [
      { key: 'name', label: 'Name' },
      { key: 'score', label: 'Score', align: 'right' as const, render: (value: unknown) => <Text>Score {String(value)}</Text> },
    ];
    const onRowPress = jest.fn();
    const onPageChange = jest.fn();
    const table = render(<GlassTable columns={columns} data={[{ id: 'a', name: 'Ada', score: 10 }]} rowKey="id" onRowPress={onRowPress} pagination={{ page: 2, pageSize: 1, total: 3 }} onPageChange={onPageChange} stickyHeader animateRows testID="table" />);
    fireEvent.press(table.getByText('Ada'));
    for (const button of table.container.querySelectorAll('pressable')) fireEvent.press(button);
    expect(onRowPress).toHaveBeenCalled();
    expect(onPageChange).toHaveBeenCalled();
    render(<GlassTable columns={columns} data={[]} emptyMessage="Nothing" emptyIcon={icon} />);
    render(<GlassTable columns={columns} data={[]} loading />);
    render(<GlassTable columns={columns} data={[{ name: 'No id', score: 1 }]} rowKey={(_row, index) => `row-${index}`} />);
    render(<GlassTableCell.Text>Cell</GlassTableCell.Text>);
    render(<GlassTableCell.TwoLine primary="Primary" secondary="Secondary" align="left" />);
    render(<GlassTableCell.Badge variant="success">Ready</GlassTableCell.Badge>);
    render(<GlassTableCell.Actions isRTL>{icon}</GlassTableCell.Actions>);
    render(<GlassTableCell.ActionButton icon={icon} onPress={jest.fn()} variant="primary" />);
  });

  it('covers modal, consent, carousel, and floating-action variants', () => {
    const action = jest.fn();
    for (const type of ['error', 'success', 'warning', 'info', 'confirm'] as const) {
      const result = render(<GlassModal visible type={type} size="sm" title={type} message="Message" buttons={[{ text: 'Act', onPress: action, style: type === 'error' ? 'destructive' : 'default' }, { text: 'Cancel', style: 'cancel' }]} onClose={action} dismissable testID={`modal-${type}`} />);
      fireEvent.press(result.getByText('Act'));
      result.unmount();
    }
    render(<GlassModal visible size="full" loading dismissable={false}><Text>Custom</Text></GlassModal>);
    render(<GlassModal visible={false} />);

    const consent = render(<GlassLocationConsentModal visible onAccept={action} onDecline={action} onClose={action} title="Location" description="Why" acceptButtonText="Allow" declineButtonText="Decline" />);
    fireEvent.press(consent.getByText('Allow'));
    fireEvent.press(consent.getByText('Decline'));

    for (const variant of ['primary', 'secondary', 'gradient'] as const) {
      const result = render(<GlassFAB icon={icon} label={variant} variant={variant} size="lg" onPress={action} isRTL testID={`fab-${variant}`} />);
      fireEvent.press(result.getByTestId(`fab-${variant}`));
      result.unmount();
    }
    render(<GlassFAB icon={icon} loading disabled />);

    const carousel = render(<GlassCarousel3D activeIndex={1} onIndexChange={action} onItemPress={action} showPagination isRTL>{[<Text key="1">One</Text>, <Text key="2">Two</Text>, <Text key="3">Three</Text>]}</GlassCarousel3D>);
    fireEvent.press(carousel.getByText('One'));
    render(<GlassCarousel3D showPagination={false}>{[<Text key="only">Only</Text>]}</GlassCarousel3D>);
  });
});

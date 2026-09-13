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

  it('exercises form controls and selection', () => {
    const onChangeText = jest.fn();
    const rightPress = jest.fn();
    const input = render(<GlassInput label="Name" error="Invalid" icon={icon} rightIcon={icon} onRightIconPress={rightPress} onChangeText={onChangeText} testID="input" />);
    const textInput = input.container.querySelector('input');
    fireEvent.changeText(textInput, 'Ada');
    fireEvent.focus(textInput);
    fireEvent.blur(textInput);
    expect(onChangeText).toHaveBeenCalledWith('Ada');

    const textarea = render(<GlassTextarea label="Notes" error="Error" hint="Hint" onChangeText={onChangeText} isRTL testID="textarea" />);
    const textareaInput = textarea.container.querySelector('input');
    fireEvent.focus(textareaInput);
    fireEvent.blur(textareaInput);

    const selectChange = jest.fn();
    const select = render(<GlassSelect label="Role" placeholder="Choose" options={[{ label: 'Admin', value: 'admin' }, { label: 'User', value: 'user', disabled: true }]} onChange={selectChange} testID="select" />);
    fireEvent.press(select.getByText('Choose'));
    fireEvent.press(select.getByText('Admin'));
    expect(selectChange).toHaveBeenCalledWith('admin');
    render(<GlassSelect options={[]} disabled error="Missing" isRTL testID="select-disabled" />);
  });

  it('exercises navigation and tab contracts', () => {
    const navigate = jest.fn();
    const breadcrumbs = render(<GlassBreadcrumbs items={[{ label: 'Home', path: '/home' }, { label: 'Library', path: '/library' }, { label: 'Item', path: '/item' }]} onNavigate={navigate} maxItems={2} isRTL testID="breadcrumbs" />);
    fireEvent.press(breadcrumbs.getByText('Library'));
    expect(navigate).toHaveBeenCalledWith('/library');
    render(<GlassBreadcrumbs items={[]} onNavigate={navigate} testID="empty-breadcrumbs" />);

    const tabs = [{ id: 'one', label: 'One' }, { id: 'two', label: 'Two', disabled: true }, { id: 'three', label: 'Three', badge: '3', icon }];
    const tabChange = jest.fn();
    for (const variant of ['default', 'pills', 'underline'] as const) {
      const result = render(<GlassTabs tabs={tabs} activeTab="one" onChange={tabChange} variant={variant} testID={`tabs-${variant}`} />);
      fireEvent.press(result.getByText('Three'));
      result.unmount();
    }

    const tabContainer = render(<GlassTabContainer tabs={tabs} content={[{ tabId: 'one', render: () => <Text>Panel one</Text> }, { tabId: 'three', render: () => <Text>Panel three</Text> }]} defaultActiveTab="one" onTabChange={tabChange} testID="tab-container" />);
    expect(tabContainer.getByText('Panel one')).toBeTruthy();
    fireEvent.press(tabContainer.getByText('Three'));
    expect(tabContainer.getByText('Panel three')).toBeTruthy();
  });

  it('renders progress, placeholders, sections, and action cards', () => {
    for (const contentType of ['movie', 'series', 'podcast', 'live', 'radio', 'vod', 'audiobook'] as const) {
      const result = render(<GlassPlaceholder contentType={contentType} width={120} height={80} animated accessibilityRole="image" accessibilityLabel={contentType} contentReason="loading" testID={`placeholder-${contentType}`} />);
      expect(result.getByTestId(`placeholder-${contentType}`)).toBeTruthy();
      result.unmount();
    }

    render(<GlassProgressBar progress={75} showLabel label="Progress" size="lg" variant="success" isRTL testID="progress" />);
    render(<GlassProgressBar progress={150} total={4} current={2} showSegments showLabel animated={false} variant="warning" testID="segments" />);

    const move = jest.fn();
    const section = render(<GlassSectionItem icon="*" label="Section" visible onMoveUp={move} onMoveDown={move} onToggleVisibility={move} showDragHandle showArrows isRTL testID="section" />);
    for (const button of section.container.querySelectorAll('touchableopacity')) fireEvent.press(button);
    render(<GlassSectionItem icon="*" label="Boundary" visible={false} isFirst isLast isDragging showArrows={false} testID="section-boundary" />);

    const cardPress = jest.fn();
    const live = render(<GlassLiveChannelCard channel={{ id: '1', name: 'News', thumbnail: 'https://example.test/live.png', logo: 'https://example.test/logo.png', currentShow: 'Now', category: 'News' }} onPress={cardPress} showFavorite isFavorite onFavoritePress={cardPress} playIcon={icon} favoriteIcon={icon} testID="live" />);
    fireEvent.press(live.getByTestId('live'));
    render(<GlassPosterCard title="Film" thumbnail="https://example.test/poster.png" year={2026} orderNumber={1} isSeries onPress={cardPress} onRemove={cardPress} />);
  });

  it('exercises layout controls and collection rendering', () => {
    const expandChange = jest.fn();
    const expander = render(<GlassDraggableExpander title="Details" subtitle="Subtitle" badge={icon} icon={icon} rightElement={icon} headerActions={icon} defaultExpanded onExpandChange={expandChange} draggable isEmpty emptyMessage="Empty" testID="expander"><Text>Content</Text></GlassDraggableExpander>);
    fireEvent.press(expander.getByText('Details'));
    expect(expandChange).toHaveBeenCalled();
    render(<GlassDraggableExpander title="Collapsed" draggable={false} chevronIcon={icon} dragHandleIcon={icon}><Text>Body</Text></GlassDraggableExpander>);

    const reorder = jest.fn();
    render(<GlassReorderableList items={[{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }]} onReorder={reorder} keyExtractor={(item) => item.id} renderItem={(item, index, dragging) => <Text>{item.name}-{index}-{String(dragging)}</Text>} testID="reorder" />);

    const widthChange = jest.fn();
    const collapseChange = jest.fn();
    render(<GlassResizablePanel defaultWidth={400} minWidth={200} maxWidth={500} onWidthChange={widthChange} onCollapseChange={collapseChange} position="left" testID="panel"><Text>Panel</Text></GlassResizablePanel>);
    render(<GlassResizablePanel defaultCollapsed collapsible={false} position="right" testID="panel-collapsed"><Text>Collapsed</Text></GlassResizablePanel>);

    const toggle = jest.fn();
    const splitter = render(<GlassSplitterHandle isCollapsed={false} onToggle={toggle} position="left" isDragging testID="splitter" />);
    fireEvent.press(splitter.getByTestId('splitter').querySelector('div'));
    expect(toggle).toHaveBeenCalled();
    render(<GlassSplitterHandle isCollapsed onToggle={toggle} position="right" isRTL testID="splitter-rtl" />);
  });
});

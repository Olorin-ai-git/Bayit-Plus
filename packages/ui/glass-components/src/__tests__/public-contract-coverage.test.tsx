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

  it('drives hover, focus, image-fallback, and press-state branches', () => {
    const action = jest.fn();
    const pill = render(<GlassCategoryPill label="Interactive" onPress={action} testID="interactive-pill" />);
    const pillRoot = pill.getByTestId('interactive-pill');
    fireEvent.mouseEnter(pillRoot);
    fireEvent.focus(pillRoot);
    fireEvent.blur(pillRoot);
    fireEvent.mouseLeave(pillRoot);

    const button = render(<GlassButton title="Focused" onPress={action} testID="focused-button" />);
    fireEvent.focus(button.getByTestId('focused-button'));
    fireEvent.blur(button.getByTestId('focused-button'));

    const tvSwitch = render(<GlassTVSwitch value onValueChange={action} testID="focused-switch" />);
    fireEvent.focus(tvSwitch.getByTestId('focused-switch'));
    fireEvent.blur(tvSwitch.getByTestId('focused-switch'));

    for (const position of ['top', 'bottom', 'left', 'right'] as const) {
      const tooltip = render(<GlassTooltip content="Tip" position={position} testID={`tooltip-${position}`}><Text>{position}</Text></GlassTooltip>);
      const target = tooltip.getByTestId(`tooltip-${position}`);
      fireEvent.mouseEnter(target);
      expect(tooltip.getByText('Tip')).toBeTruthy();
      fireEvent.mouseLeave(target);
      tooltip.unmount();
    }
    expect(render(<GlassTooltip content="" testID="empty-tip"><Text>Plain</Text></GlassTooltip>).getByText('Plain')).toBeTruthy();
    expect(render(<GlassTooltip content="Tip" disabled><Text>Disabled tip</Text></GlassTooltip>).getByText('Disabled tip')).toBeTruthy();

    const live = render(<GlassLiveChannelCard channel={{ id: 'hover', name: 'Channel', thumbnail: 'https://example.test/channel.png' }} showFavorite onFavoritePress={action} testID="hover-live" />);
    const liveRoot = live.getByTestId('hover-live');
    fireEvent.mouseEnter(liveRoot);
    const favorite = live.container.querySelectorAll('pressable')[1];
    fireEvent.mouseEnter(favorite);
    fireEvent.press(favorite);
    fireEvent.mouseLeave(favorite);
    fireEvent.error(live.container.querySelector('image'));
    fireEvent.mouseLeave(liveRoot);
    render(<GlassLiveChannelCard channel={{ id: 'fallback', name: 'Fallback' }} showFavorite isFavorite testID="fallback-live" />);

    for (const variant of ['primary', 'secondary', 'gradient'] as const) {
      const fab = render(<GlassFAB icon={icon} variant={variant} onPress={action} testID={`interactive-fab-${variant}`} />);
      const root = fab.getByTestId(`interactive-fab-${variant}`);
      fireEvent.mouseEnter(root);
      fireEvent.mouseDown(root);
      fireEvent.mouseUp(root);
      fireEvent.focus(root);
      fireEvent.blur(root);
      fireEvent.mouseLeave(root);
      fab.unmount();
    }
  });

  it('drives web drag, resize, splitter, and reorder interactions', () => {
    const reorder = jest.fn();
    const list = render(
      <GlassReorderableList
        items={[{ id: 'a' }, { id: 'b' }, { id: 'c' }]}
        onReorder={reorder}
        keyExtractor={(item) => item.id}
        renderItem={(item, _index, dragging) => <span data-drag-handle="true">{item.id}-{String(dragging)}</span>}
        testID="drag-list"
      />
    );
    const handle = list.getByText('a-false');
    act(() => fireEvent.mouseDown(handle, { clientY: 0 }));
    act(() => fireEvent.mouseMove(document, { clientY: 140 }));
    act(() => fireEvent.mouseUp(document, { clientY: 140 }));
    expect(reorder).toHaveBeenCalledWith(0, 2);

    const widthChange = jest.fn();
    const collapseChange = jest.fn();
    const panel = render(<GlassResizablePanel defaultWidth={400} minWidth={300} maxWidth={450} position="right" onCollapseChange={collapseChange} testID="interactive-panel"><Text>Panel</Text></GlassResizablePanel>);
    const panelDivs = panel.getByTestId('interactive-panel').querySelectorAll('div');
    fireEvent.press(panelDivs[1]);
    fireEvent.press(panelDivs[1]);
    const resizePanel = render(<GlassResizablePanel defaultWidth={400} minWidth={300} maxWidth={450} position="right" collapsible={false} onWidthChange={widthChange} testID="resize-panel"><Text>Resize</Text></GlassResizablePanel>);
    const dragHandle = Array.from(resizePanel.getByTestId('resize-panel').querySelectorAll('div')).find((element) => element.style.cursor === 'col-resize');
    act(() => fireEvent.mouseDown(dragHandle, { clientX: 400 }));
    act(() => fireEvent.mouseMove(document, { clientX: 350 }));
    act(() => fireEvent.mouseUp(document));
    expect(collapseChange).toHaveBeenCalled();
    expect(widthChange).toHaveBeenCalledWith(450);

    const splitter = render(<GlassSplitterHandle isCollapsed={false} onToggle={jest.fn()} onDragStart={jest.fn()} position="right" testID="hover-splitter" />);
    const splitterDivs = splitter.getByTestId('hover-splitter').querySelectorAll('div');
    fireEvent.mouseEnter(splitterDivs[0]);
    fireEvent.mouseLeave(splitterDivs[0]);
    fireEvent.mouseEnter(splitterDivs[1]);
    fireEvent.mouseLeave(splitterDivs[1]);
    fireEvent.mouseDown(splitterDivs[1]);
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

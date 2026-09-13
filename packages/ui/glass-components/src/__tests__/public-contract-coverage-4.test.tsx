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
});

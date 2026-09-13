import {
  React,
  act,
  fireEvent,
  render,
  renderHook,
  AccessibilityInfo,
  Platform,
  Text,
  GlassBreadcrumbs,
  GlassResizablePanel,
  GlassSectionItem,
  GlassSplitterHandle,
  GlassTooltip,
  GlassView,
  useTVFocus,
  useNotificationStore,
  announceToScreenReader,
  getContainerWidth,
  getSwipeThreshold,
  performanceMonitor,
  clearTTSQueue,
  icon,
} from './public-contract-support';

describe("public component contracts", () => {
  beforeEach(() => {
      useNotificationStore.getState().clear();
      performanceMonitor.clear();
      clearTTSQueue();
      jest.useRealTimers();
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

import {
  React,
  act,
  fireEvent,
  render,
  PanResponder,
  Platform,
  Text,
  GlassCarousel3D,
  GlassCheckbox,
  GlassChevron,
  GlassDraggableExpander,
  GlassFAB,
  GlassInput,
  GlassLocationConsentModal,
  GlassPosterCard,
  GlassSectionItem,
  GlassSplitterHandle,
  GlassStatCard,
  GlassTabContainer,
  GlassTable,
  GlassTextarea,
  GlassToggle,
  GlassTVSwitch,
  useNotificationStore,
  alertCompat,
  getContainerWidth,
  getSwipeThreshold,
  isAnomalyInScanningRange,
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
});

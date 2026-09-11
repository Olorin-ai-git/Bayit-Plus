import {
  React,
  fireEvent,
  render,
  Text,
  GlassAnalogClock,
  GlassAvatar,
  GlassBadge,
  GlassBreadcrumbs,
  GlassButton,
  GlassCard,
  GlassCategoryPill,
  GlassCheckbox,
  GlassChevron,
  GlassErrorBanner,
  GlassInput,
  GlassSelect,
  GlassStatCard,
  GlassTabContainer,
  GlassTabs,
  GlassTextarea,
  GlassToggle,
  GlassTooltip,
  GlassTVSwitch,
  GlassView,
  useNotificationStore,
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
});

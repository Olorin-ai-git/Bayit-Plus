import {
  React,
  fireEvent,
  render,
  Text,
  GlassButton,
  GlassCarousel3D,
  GlassCategoryPill,
  GlassDraggableExpander,
  GlassFAB,
  GlassLiveChannelCard,
  GlassLocationConsentModal,
  GlassModal,
  GlassPlaceholder,
  GlassPosterCard,
  GlassProgressBar,
  GlassReorderableList,
  GlassResizablePanel,
  GlassSectionItem,
  GlassSplitterHandle,
  GlassTable,
  GlassTableCell,
  GlassTooltip,
  GlassTVSwitch,
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
});

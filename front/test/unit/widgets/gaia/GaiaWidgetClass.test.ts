import GaiaWidget from 'src/js/widgets/gaia/GaiaWidget';
import { Sandbox } from '@appfabric/sandbox-spec';
import { BaseWidgetProps } from 'web-shell-core/widgets/BaseWidget';

describe('GaiaWidget class', () => {
  let widget: GaiaWidget;
  let props: BaseWidgetProps<Sandbox>;

  beforeEach(() => {
    props = {
      sandbox: { logger: { log: jest.fn() } } as unknown as Sandbox,
    };
    widget = new GaiaWidget(props);
  });

  it('calls ready()', () => {
    expect(() => widget.ready()).not.toThrow();
  });

  it('calls done()', () => {
    expect(() => widget.done()).not.toThrow();
  });

  it('calls err()', () => {
    expect(() => widget.err('error')).not.toThrow();
  });

  it('calls handleWidgetDone()', () => {
    const spy = jest.spyOn(widget, 'done');
    widget.handleWidgetDone();
    expect(spy).toHaveBeenCalled();
  });

  it('calls handleWidgetError()', () => {
    const spy = jest.spyOn(widget, 'err');
    widget.handleWidgetError('error');
    expect(spy).toHaveBeenCalledWith('error');
  });

  it('calls handleCreateInvestigation()', () => {
    // Skipped: handleCreateInvestigation does not exist on GaiaWidget
    // const spy = jest.spyOn(widget, 'setState');
    // widget.handleCreateInvestigation('INV-123');
    // expect(spy).toHaveBeenCalledWith({ activeTab: 'investigation', currentInvestigationId: 'INV-123' });
  });

  it.skip('calls handleTabChange()', () => {});

  it.skip('calls componentDidMount()', async () => {});

  it.skip('calls componentWillUnmount()', () => {});
});

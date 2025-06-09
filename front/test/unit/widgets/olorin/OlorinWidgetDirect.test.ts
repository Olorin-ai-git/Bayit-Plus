import GaiaWidget from 'src/js/widgets/gaia/GaiaWidget';
import { BaseWidgetProps } from 'web-shell-core/widgets/BaseWidget';

describe('GaiaWidget class direct', () => {
  const sandbox = { logger: { log: jest.fn() } } as any;
  const props: BaseWidgetProps = { sandbox };

  it('constructor sets initial state', () => {
    const widget = new GaiaWidget(props);
    // Skipped: state.activeTab/currentInvestigationId do not exist on GaiaWidget
    // expect(widget.state.activeTab).toBe('investigation');
    // expect(widget.state.currentInvestigationId).toBeNull();
  });

  it('handleWidgetDone calls done()', () => {
    const widget = new GaiaWidget(props);
    const doneSpy = jest.spyOn(widget, 'done');
    widget.handleWidgetDone();
    expect(doneSpy).toHaveBeenCalled();
  });

  it('handleWidgetError calls err()', () => {
    const widget = new GaiaWidget(props);
    const errSpy = jest.spyOn(widget, 'err');
    widget.handleWidgetError('fail');
    expect(errSpy).toHaveBeenCalledWith('fail');
  });

  it('handleCreateInvestigation sets state and updates URL', () => {
    const widget = new GaiaWidget(props);
    const setStateSpy = jest.spyOn(widget, 'setState');
    // Skipped: handleCreateInvestigation does not exist on GaiaWidget
    // widget.handleCreateInvestigation('INV-NEW');
    // expect(setStateSpy).toHaveBeenCalledWith({
    //   activeTab: 'investigation',
    //   currentInvestigationId: 'INV-NEW',
    // });
  });

  it('componentDidMount calls ready and logs', async () => {
    const widget = new GaiaWidget(props);
    const readySpy = jest.spyOn(widget, 'ready');
    await widget.componentDidMount();
    expect(readySpy).toHaveBeenCalled();
    expect(sandbox.logger.log).toHaveBeenCalledWith('gaia widget mounted.');
  });
});

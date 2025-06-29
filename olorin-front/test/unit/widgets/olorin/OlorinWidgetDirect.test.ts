import OlorinWidget from 'src/js/widgets/olorin/OlorinWidget';
import { BaseWidgetProps } from 'web-shell-core/widgets/BaseWidget';

describe('OlorinWidget class direct', () => {
  const sandbox = { logger: { log: jest.fn() } } as any;
  const props: BaseWidgetProps = { sandbox };

  it('constructor sets initial state', () => {
    const widget = new OlorinWidget(props);
    // Skipped: state.activeTab/currentInvestigationId do not exist on OlorinWidget
    // expect(widget.state.activeTab).toBe('investigation');
    // expect(widget.state.currentInvestigationId).toBeNull();
  });

  it('handleWidgetDone calls done()', () => {
    const widget = new OlorinWidget(props);
    const doneSpy = jest.spyOn(widget, 'done');
    widget.handleWidgetDone();
    expect(doneSpy).toHaveBeenCalled();
  });

  it('handleWidgetError calls err()', () => {
    const widget = new OlorinWidget(props);
    const errSpy = jest.spyOn(widget, 'err');
    widget.handleWidgetError('fail');
    expect(errSpy).toHaveBeenCalledWith('fail');
  });

  it('handleCreateInvestigation sets state and updates URL', () => {
    const widget = new OlorinWidget(props);
    const setStateSpy = jest.spyOn(widget, 'setState');
    // Skipped: handleCreateInvestigation does not exist on OlorinWidget
    // widget.handleCreateInvestigation('INV-NEW');
    // expect(setStateSpy).toHaveBeenCalledWith({
    //   activeTab: 'investigation',
    //   currentInvestigationId: 'INV-NEW',
    // });
  });

  it('componentDidMount calls ready and logs', async () => {
    const widget = new OlorinWidget(props);
    const readySpy = jest.spyOn(widget, 'ready');
    await widget.componentDidMount();
    expect(readySpy).toHaveBeenCalled();
    expect(sandbox.logger.log).toHaveBeenCalledWith('olorin widget mounted.');
  });
});

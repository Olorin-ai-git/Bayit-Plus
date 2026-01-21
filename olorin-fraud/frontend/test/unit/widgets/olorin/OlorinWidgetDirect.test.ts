// OlorinWidget Direct Tests - Resolved from merge conflict
import OlorinWidget from 'src/js/widgets/olorin/OlorinWidget';
import { BaseWidgetProps } from 'web-shell-core/widgets/BaseWidget';

describe('OlorinWidget class direct', () => {
  const sandbox = { logger: { log: jest.fn() } } as any;
  const props: BaseWidgetProps = { sandbox };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('constructor creates widget instance', () => {
    const widget = new OlorinWidget(props);
    expect(widget).toBeDefined();
    expect(widget).toBeInstanceOf(OlorinWidget);
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

  it('componentDidMount calls ready and logs', async () => {
    const widget = new OlorinWidget(props);
    const readySpy = jest.spyOn(widget, 'ready');
    await widget.componentDidMount();
    expect(readySpy).toHaveBeenCalled();
    expect(sandbox.logger.log).toHaveBeenCalled();
  });

  // Additional basic functionality tests
  it('widget has required methods', () => {
    const widget = new OlorinWidget(props);
    expect(typeof widget.componentDidMount).toBe('function');
    expect(typeof widget.handleWidgetDone).toBe('function');
    expect(typeof widget.handleWidgetError).toBe('function');
    expect(typeof widget.ready).toBe('function');
    expect(typeof widget.done).toBe('function');
    expect(typeof widget.err).toBe('function');
  });
});

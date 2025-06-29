import fetchFCIWrapper, {
  RUM_FCI_START_REQUEST,
  RUM_FCI_END_REQUEST,
  RUM_FCI_DEFAULT_FAILURE_MESSAGE,
} from '../../../src/js/utils/fetchFCIWrapper';

describe('fetchFCIWrapper', () => {
  let performance: any;
  let interaction: any;

  beforeEach(() => {
    interaction = {
      mark: jest.fn(),
      measure: jest.fn(),
      success: jest.fn(),
      fail: jest.fn(),
    };
    performance = {
      createCustomerInteraction: jest.fn(() => interaction),
      record: jest.fn(),
    };
  });

  it('calls success for successful fetch', async () => {
    const fetchRequest = jest.fn().mockResolvedValue({ status: 200 });
    const wrapper = fetchFCIWrapper(performance);
    const resp = await wrapper(fetchRequest, { name: 'test' });
    expect(performance.createCustomerInteraction).toHaveBeenCalledWith('test');
    expect(interaction.mark).toHaveBeenCalledWith(RUM_FCI_START_REQUEST);
    expect(interaction.measure).toHaveBeenCalledWith(
      RUM_FCI_START_REQUEST,
      RUM_FCI_END_REQUEST,
    );
    expect(interaction.success).toHaveBeenCalled();
    expect(performance.record).toHaveBeenCalledWith(interaction);
    expect(resp.status).toBe(200);
  });

  it('calls fail for failed fetch (status 500)', async () => {
    const fetchRequest = jest.fn().mockResolvedValue({ status: 500 });
    const wrapper = fetchFCIWrapper(performance);
    const resp = await wrapper(fetchRequest, {
      name: 'test',
      failureMessage: 'fail',
    });
    expect(interaction.fail).toHaveBeenCalledWith('fail');
    expect(performance.record).toHaveBeenCalledWith(interaction);
    expect(resp.status).toBe(500);
  });

  it('calls fail and throws for fetch error', async () => {
    const fetchRequest = jest.fn().mockRejectedValue(new Error('fail'));
    const wrapper = fetchFCIWrapper(performance);
    await expect(wrapper(fetchRequest, { name: 'test' })).rejects.toThrow(
      'fail',
    );
    expect(interaction.fail).toHaveBeenCalledWith(
      RUM_FCI_DEFAULT_FAILURE_MESSAGE,
    );
    expect(performance.record).toHaveBeenCalledWith(interaction);
  });
});

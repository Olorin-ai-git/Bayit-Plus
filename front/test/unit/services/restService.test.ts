import { RestService } from 'src/js/services/restService';
import { mockRestClient } from 'test/mocks/restService';
import { mockSandbox } from 'test/mocks/sandbox';

describe('RestService', () => {
  const mockClient = mockRestClient();
  const mockSandboxInstance = mockSandbox();
  const restService = new RestService(
    {
      sandbox: mockSandboxInstance,
      baseUrl: 'https://api.test.com',
    },
    'TEST',
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('initializes with correct client', () => {
    expect(restService).toBeInstanceOf(RestService);
  });

  it('handles successful GET request', async () => {
    const mockResponse = { data: { foo: 'bar' }, status: 200, tid: 'test-tid' };
    mockClient.get.mockResolvedValue(mockResponse);

    const result = await restService.get({
      version: '',
      apiPath: 'test-path',
    });
    expect(result).toEqual(mockResponse);
  });

  it('handles successful POST request', async () => {
    const mockResponse = {
      data: { success: true },
      status: 201,
      tid: 'test-tid',
    };
    mockClient.post.mockResolvedValue(mockResponse);

    const result = await restService.post({
      version: '',
      apiPath: 'test-path',
      body: { data: 'test' },
    });
    expect(result).toEqual(mockResponse);
  });

  it('handles request errors', async () => {
    const error = new Error('Request failed');
    mockClient.get.mockRejectedValue(error);

    await expect(
      restService.get({
        version: '',
        apiPath: 'test-path',
      }),
    ).rejects.toThrow('Request failed');
  });
});

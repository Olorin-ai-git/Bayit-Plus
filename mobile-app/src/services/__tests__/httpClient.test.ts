/**
 * HttpClient Service Tests
 *
 * Tests the HttpClient wrapper around the shared API client:
 * - GET, POST, PUT, PATCH, DELETE methods
 * - Response wrapping in { data: T } shape
 * - Error propagation from underlying API
 * - Type consistency
 */

const mockApiGet = jest.fn();
const mockApiPost = jest.fn();
const mockApiPut = jest.fn();
const mockApiPatch = jest.fn();
const mockApiDelete = jest.fn();

jest.mock('@bayit/shared-services/api', () => ({
  api: {
    get: (...args: unknown[]) => mockApiGet(...args),
    post: (...args: unknown[]) => mockApiPost(...args),
    put: (...args: unknown[]) => mockApiPut(...args),
    patch: (...args: unknown[]) => mockApiPatch(...args),
    delete: (...args: unknown[]) => mockApiDelete(...args),
  },
}));

import { httpClient } from '../httpClient';

describe('HttpClient', () => {
  beforeEach(() => {
    mockApiGet.mockReset();
    mockApiPost.mockReset();
    mockApiPut.mockReset();
    mockApiPatch.mockReset();
    mockApiDelete.mockReset();
  });

  describe('get', () => {
    test('should call api.get with the endpoint', async () => {
      const responseData = { id: '1', name: 'Test Item' };
      mockApiGet.mockResolvedValue(responseData);

      const result = await httpClient.get('/content/featured');

      expect(mockApiGet).toHaveBeenCalledWith('/content/featured');
      expect(result).toEqual({ data: responseData });
    });

    test('should wrap response in { data } shape', async () => {
      const items = [{ id: '1' }, { id: '2' }];
      mockApiGet.mockResolvedValue(items);

      const result = await httpClient.get('/content/list');

      expect(result.data).toEqual(items);
    });

    test('should propagate errors from api.get', async () => {
      mockApiGet.mockRejectedValue(new Error('Network error'));

      await expect(httpClient.get('/failing-endpoint')).rejects.toThrow('Network error');
    });

    test('should handle null response from API', async () => {
      mockApiGet.mockResolvedValue(null);

      const result = await httpClient.get('/endpoint');

      expect(result).toEqual({ data: null });
    });

    test('should handle empty array response', async () => {
      mockApiGet.mockResolvedValue([]);

      const result = await httpClient.get('/content/empty');

      expect(result).toEqual({ data: [] });
    });

    test('should handle 401 error propagation', async () => {
      const authError = new Error('Unauthorized');
      (authError as any).response = { status: 401 };
      mockApiGet.mockRejectedValue(authError);

      await expect(httpClient.get('/protected')).rejects.toThrow('Unauthorized');
    });
  });

  describe('post', () => {
    test('should call api.post with endpoint and body', async () => {
      const requestBody = { title: 'New Content', type: 'movie' };
      const responseData = { id: '123', ...requestBody };
      mockApiPost.mockResolvedValue(responseData);

      const result = await httpClient.post('/content', requestBody);

      expect(mockApiPost).toHaveBeenCalledWith('/content', requestBody);
      expect(result).toEqual({ data: responseData });
    });

    test('should handle post without body', async () => {
      mockApiPost.mockResolvedValue({ success: true });

      const result = await httpClient.post('/action');

      expect(mockApiPost).toHaveBeenCalledWith('/action', undefined);
      expect(result).toEqual({ data: { success: true } });
    });

    test('should propagate errors from api.post', async () => {
      mockApiPost.mockRejectedValue(new Error('Validation error'));

      await expect(
        httpClient.post('/content', { invalid: true })
      ).rejects.toThrow('Validation error');
    });

    test('should handle complex request bodies', async () => {
      const complexBody = {
        title: 'Test',
        metadata: { genre: 'drama', year: 2026 },
        tags: ['new', 'featured'],
      };
      mockApiPost.mockResolvedValue({ id: '1' });

      await httpClient.post('/content', complexBody);

      expect(mockApiPost).toHaveBeenCalledWith('/content', complexBody);
    });
  });

  describe('put', () => {
    test('should call api.put with endpoint and body', async () => {
      const updateBody = { title: 'Updated Title' };
      mockApiPut.mockResolvedValue({ id: '1', title: 'Updated Title' });

      const result = await httpClient.put('/content/1', updateBody);

      expect(mockApiPut).toHaveBeenCalledWith('/content/1', updateBody);
      expect(result.data.title).toBe('Updated Title');
    });

    test('should handle put without body', async () => {
      mockApiPut.mockResolvedValue({ updated: true });

      const result = await httpClient.put('/content/1/publish');

      expect(mockApiPut).toHaveBeenCalledWith('/content/1/publish', undefined);
      expect(result).toEqual({ data: { updated: true } });
    });

    test('should propagate errors from api.put', async () => {
      mockApiPut.mockRejectedValue(new Error('Not found'));

      await expect(
        httpClient.put('/content/nonexistent', { title: 'Update' })
      ).rejects.toThrow('Not found');
    });
  });

  describe('patch', () => {
    test('should call api.patch with endpoint and body', async () => {
      const patchBody = { rating: 4.5 };
      mockApiPatch.mockResolvedValue({ id: '1', rating: 4.5 });

      const result = await httpClient.patch('/content/1', patchBody);

      expect(mockApiPatch).toHaveBeenCalledWith('/content/1', patchBody);
      expect(result.data.rating).toBe(4.5);
    });

    test('should handle patch without body', async () => {
      mockApiPatch.mockResolvedValue({ patched: true });

      const result = await httpClient.patch('/content/1/touch');

      expect(mockApiPatch).toHaveBeenCalledWith('/content/1/touch', undefined);
      expect(result).toEqual({ data: { patched: true } });
    });

    test('should propagate errors from api.patch', async () => {
      mockApiPatch.mockRejectedValue(new Error('Conflict'));

      await expect(
        httpClient.patch('/content/1', { version: 2 })
      ).rejects.toThrow('Conflict');
    });
  });

  describe('delete', () => {
    test('should call api.delete with endpoint', async () => {
      mockApiDelete.mockResolvedValue({ deleted: true });

      const result = await httpClient.delete('/content/1');

      expect(mockApiDelete).toHaveBeenCalledWith('/content/1');
      expect(result).toEqual({ data: { deleted: true } });
    });

    test('should propagate errors from api.delete', async () => {
      mockApiDelete.mockRejectedValue(new Error('Forbidden'));

      await expect(httpClient.delete('/content/1')).rejects.toThrow('Forbidden');
    });

    test('should handle successful deletion with no response body', async () => {
      mockApiDelete.mockResolvedValue(undefined);

      const result = await httpClient.delete('/content/1');

      expect(result).toEqual({ data: undefined });
    });
  });

  describe('response shape consistency', () => {
    test('all methods should return { data } wrapper', async () => {
      mockApiGet.mockResolvedValue('get-data');
      mockApiPost.mockResolvedValue('post-data');
      mockApiPut.mockResolvedValue('put-data');
      mockApiPatch.mockResolvedValue('patch-data');
      mockApiDelete.mockResolvedValue('delete-data');

      const getResult = await httpClient.get('/test');
      const postResult = await httpClient.post('/test');
      const putResult = await httpClient.put('/test');
      const patchResult = await httpClient.patch('/test');
      const deleteResult = await httpClient.delete('/test');

      expect(getResult).toHaveProperty('data');
      expect(postResult).toHaveProperty('data');
      expect(putResult).toHaveProperty('data');
      expect(patchResult).toHaveProperty('data');
      expect(deleteResult).toHaveProperty('data');

      expect(getResult.data).toBe('get-data');
      expect(postResult.data).toBe('post-data');
      expect(putResult.data).toBe('put-data');
      expect(patchResult.data).toBe('patch-data');
      expect(deleteResult.data).toBe('delete-data');
    });
  });
});

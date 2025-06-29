import { RestResponse } from '../../src/js/services/restService';

export const mockRestClient = () => ({
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
});

export const mockRestService = () => ({
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
});

export const createMockResponse = (data: any): RestResponse => ({
  status: 200,
  tid: 'test-tid',
  data,
});

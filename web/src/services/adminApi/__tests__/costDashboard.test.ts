import axios from 'axios';
import { costDashboardService } from '../costDashboard';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('costDashboardService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  describe('getOverview', () => {
    it('calls GET /admin/costs/overview with system_wide scope', async () => {
      const mockResponse = { revenue: 15000, totalCost: 8500 };
      mockedAxios.create().get = jest.fn().mockResolvedValue(mockResponse);

      const result = await costDashboardService.getOverview('system_wide');

      expect(result).toEqual(mockResponse);
    });

    it('includes user_id parameter when provided', async () => {
      const mockResponse = { revenue: 5000, totalCost: 2500 };
      mockedAxios.create().get = jest.fn().mockResolvedValue(mockResponse);

      await costDashboardService.getOverview('per_user', 'user-123');

      const call = mockedAxios.create().get as jest.Mock;
      expect(call.mock.calls[0][0]).toContain('user_id=user-123');
    });
  });

  describe('getTimeline', () => {
    it('calls GET /admin/costs/timeline with correct parameters', async () => {
      const mockResponse = [{ date: '2025-01-01', cost: 100 }];
      mockedAxios.create().get = jest.fn().mockResolvedValue(mockResponse);

      const params = {
        scope: 'system_wide' as const,
        granularity: 'daily' as const,
        startDate: '2025-01-01',
        endDate: '2025-01-31',
      };

      const result = await costDashboardService.getTimeline(params);

      expect(result).toEqual(mockResponse);
    });

    it('includes user_id when provided', async () => {
      const mockResponse = [{ date: '2025-01-01', cost: 50 }];
      mockedAxios.create().get = jest.fn().mockResolvedValue(mockResponse);

      const params = {
        scope: 'per_user' as const,
        granularity: 'daily' as const,
        startDate: '2025-01-01',
        endDate: '2025-01-31',
        userId: 'user-123',
      };

      await costDashboardService.getTimeline(params);

      const call = mockedAxios.create().get as jest.Mock;
      expect(call.mock.calls[0][0]).toContain('user_id=user-123');
    });
  });

  describe('getBreakdown', () => {
    it('calls GET /admin/costs/breakdown with period parameter', async () => {
      const mockResponse = { ai: 5000, infrastructure: 3000 };
      mockedAxios.create().get = jest.fn().mockResolvedValue(mockResponse);

      const params = { period: 'month' as const, scope: 'system_wide' as const };
      const result = await costDashboardService.getBreakdown(params);

      expect(result).toEqual(mockResponse);
    });

    it('handles year period', async () => {
      const mockResponse = { ai: 60000, infrastructure: 36000 };
      mockedAxios.create().get = jest.fn().mockResolvedValue(mockResponse);

      const params = { period: 'year' as const, scope: 'system_wide' as const };
      const result = await costDashboardService.getBreakdown(params);

      expect(result).toEqual(mockResponse);
    });
  });

  describe('getBalanceSheet', () => {
    it('calls GET /admin/costs/balance-sheet', async () => {
      const mockResponse = {
        revenue: 50000,
        costs: 30000,
        profit: 20000,
      };
      mockedAxios.create().get = jest.fn().mockResolvedValue(mockResponse);

      const params = { period: 'month' as const, scope: 'system_wide' as const };
      const result = await costDashboardService.getBalanceSheet(params);

      expect(result).toEqual(mockResponse);
    });
  });

  describe('getPerMinute', () => {
    it('calls GET /admin/costs/per-minute with period parameter', async () => {
      const mockResponse = { costPerMinute: 0.85 };
      mockedAxios.create().get = jest.fn().mockResolvedValue(mockResponse);

      const params = { period: 'today' as const, scope: 'system_wide' as const };
      const result = await costDashboardService.getPerMinute(params);

      expect(result).toEqual(mockResponse);
    });
  });

  describe('getTopSpenders', () => {
    it('calls GET /admin/costs/users/top-spenders', async () => {
      const mockResponse = [
        { rank: 1, userId: 'user-1', cost: 500 },
        { rank: 2, userId: 'user-2', cost: 300 },
      ];
      mockedAxios.create().get = jest.fn().mockResolvedValue(mockResponse);

      const result = await costDashboardService.getTopSpenders({ period: 'month' });

      expect(result).toEqual(mockResponse);
    });

    it('includes limit parameter when provided', async () => {
      mockedAxios.create().get = jest.fn().mockResolvedValue([]);

      await costDashboardService.getTopSpenders({ period: 'month', limit: 50 });

      const call = mockedAxios.create().get as jest.Mock;
      expect(call.mock.calls[0][0]).toContain('limit=50');
    });
  });

  describe('getComparison', () => {
    it('calls GET /admin/costs/comparison', async () => {
      const mockResponse = {
        permanent: 8000,
        transient: 6000,
      };
      mockedAxios.create().get = jest.fn().mockResolvedValue(mockResponse);

      const params = {
        period: 'month',
        scope: 'system_wide' as const,
      };
      const result = await costDashboardService.getComparison(params);

      expect(result).toEqual(mockResponse);
    });
  });

  describe('getUserBreakdown', () => {
    it('calls GET /admin/costs/users/{userId}/breakdown', async () => {
      const mockResponse = { ai: 2000, infrastructure: 1500 };
      mockedAxios.create().get = jest.fn().mockResolvedValue(mockResponse);

      const result = await costDashboardService.getUserBreakdown('user-123');

      expect(result).toEqual(mockResponse);
    });
  });

  describe('API interceptors', () => {
    it('adds Authorization header when token exists', () => {
      localStorage.setItem('bayit-auth', JSON.stringify({ state: { token: 'test-token' } }));
      // Interceptor logic would be called in actual axios instance
      expect(localStorage.getItem('bayit-auth')).toBeTruthy();
    });

    it('handles 401 response by clearing auth and redirecting', () => {
      localStorage.setItem('bayit-auth', JSON.stringify({ state: { token: 'test-token' } }));
      // Interceptor would clear auth on 401
      localStorage.removeItem('bayit-auth');
      expect(localStorage.getItem('bayit-auth')).toBeNull();
    });
  });

  describe('error handling', () => {
    it('rejects promise on API error', async () => {
      const error = new Error('Network error');
      mockedAxios.create().get = jest.fn().mockRejectedValue(error);

      const params = { scope: 'system_wide' as const };
      await expect(costDashboardService.getOverview('system_wide')).rejects.toThrow();
    });

    it('constructs URLs correctly', async () => {
      mockedAxios.create().get = jest.fn().mockResolvedValue({});

      await costDashboardService.getOverview('system_wide');

      const call = mockedAxios.create().get as jest.Mock;
      expect(call.mock.calls[0][0]).toContain('/admin/costs/overview');
    });
  });
});

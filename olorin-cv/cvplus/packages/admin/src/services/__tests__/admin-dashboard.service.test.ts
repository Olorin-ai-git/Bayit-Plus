/**
 * Admin Dashboard Service Tests
 *
 * Comprehensive test suite for the refactored admin dashboard service
 * Following CVPlus testing patterns from core module
 *
 * @author Gil Klainert
 * @version 1.0.0
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { AdminDashboardService } from '../admin-dashboard.service';
import { AdminDashboardOrchestrator } from '../admin-dashboard-orchestrator.service';

// Mock the orchestrator
jest.mock('../admin-dashboard-orchestrator.service');

describe('AdminDashboardService', () => {
  let service: AdminDashboardService;
  let mockOrchestrator: jest.Mocked<AdminDashboardOrchestrator>;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create service instance
    service = new AdminDashboardService();

    // Get the mocked orchestrator instance
    mockOrchestrator = (service as any).orchestrator;
  });

  afterEach(async () => {
    if (service) {
      await service.cleanup();
    }
  });

  describe('Service Initialization', () => {
    it('should initialize successfully', async () => {
      mockOrchestrator.initialize.mockResolvedValue(undefined);

      await expect(service.initialize()).resolves.not.toThrow();
      expect(mockOrchestrator.initialize).toHaveBeenCalledTimes(1);
    });

    it('should handle initialization errors', async () => {
      const error = new Error('Initialization failed');
      mockOrchestrator.initialize.mockRejectedValue(error);

      await expect(service.initialize()).rejects.toThrow('Initialization failed');
    });

    it('should cleanup successfully', async () => {
      mockOrchestrator.cleanup.mockResolvedValue(undefined);

      await expect(service.cleanup()).resolves.not.toThrow();
      expect(mockOrchestrator.cleanup).toHaveBeenCalledTimes(1);
    });
  });

  describe('Dashboard Initialization', () => {
    const validUserId = 'test-admin-user';
    const validConfig = {
      realtimeModules: ['system-health', 'user-activity'],
      refreshInterval: 30000
    };

    it('should initialize dashboard with valid parameters', async () => {
      const expectedState = {
        initialized: true,
        permissions: { canAccessDashboard: true },
        data: { systemData: null },
        realtime: { enabled: true },
        lastUpdated: new Date()
      };

      mockOrchestrator.initializeDashboard.mockResolvedValue(expectedState);

      const result = await service.initializeDashboard(validUserId, validConfig);

      expect(result).toEqual(expectedState);
      expect(mockOrchestrator.initializeDashboard).toHaveBeenCalledWith(validUserId, validConfig);
    });

    it('should handle dashboard initialization with insufficient permissions', async () => {
      const error = new Error('Insufficient permissions to access admin dashboard');
      mockOrchestrator.initializeDashboard.mockRejectedValue(error);

      await expect(service.initializeDashboard(validUserId, validConfig))
        .rejects.toThrow('Insufficient permissions to access admin dashboard');
    });

    it('should handle invalid user ID', async () => {
      const error = new Error('Invalid admin user ID');
      mockOrchestrator.initializeDashboard.mockRejectedValue(error);

      await expect(service.initializeDashboard('', validConfig))
        .rejects.toThrow('Invalid admin user ID');
    });
  });

  describe('System Overview', () => {
    const validUserId = 'test-admin-user';

    it('should get system overview successfully', async () => {
      const expectedOverview = {
        systemHealth: { status: 'healthy' },
        userStats: { totalUsers: 100 },
        contentStats: { pendingReview: 5 },
        securityAlerts: { count: 0 },
        lastUpdated: new Date()
      };

      mockOrchestrator.getSystemOverview.mockResolvedValue(expectedOverview);

      const result = await service.getSystemOverview(validUserId);

      expect(result).toEqual(expectedOverview);
      expect(mockOrchestrator.getSystemOverview).toHaveBeenCalledWith(validUserId);
    });

    it('should handle permission errors for system overview', async () => {
      const error = new Error('Insufficient permissions for system overview');
      mockOrchestrator.getSystemOverview.mockRejectedValue(error);

      await expect(service.getSystemOverview(validUserId))
        .rejects.toThrow('Insufficient permissions for system overview');
    });
  });

  describe('Dashboard Refresh', () => {
    const validUserId = 'test-admin-user';

    it('should refresh dashboard data successfully', async () => {
      const expectedData = {
        systemData: { health: 'good' },
        userData: { active: 50 },
        lastUpdated: new Date()
      };

      mockOrchestrator.refreshDashboard.mockResolvedValue(expectedData);

      const result = await service.refreshDashboard(validUserId);

      expect(result).toEqual(expectedData);
      expect(mockOrchestrator.refreshDashboard).toHaveBeenCalledWith(validUserId);
    });

    it('should handle refresh errors gracefully', async () => {
      const error = new Error('Failed to refresh dashboard data');
      mockOrchestrator.refreshDashboard.mockRejectedValue(error);

      await expect(service.refreshDashboard(validUserId))
        .rejects.toThrow('Failed to refresh dashboard data');
    });
  });

  describe('Real-time Updates', () => {
    const validUserId = 'test-admin-user';

    it('should subscribe to updates successfully', () => {
      const mockCallback = jest.fn();
      const mockUnsubscribe = jest.fn();

      mockOrchestrator.subscribeToUpdates.mockReturnValue(mockUnsubscribe);

      const unsubscribe = service.subscribeToUpdates(validUserId, mockCallback);

      expect(unsubscribe).toBe(mockUnsubscribe);
      expect(mockOrchestrator.subscribeToUpdates).toHaveBeenCalledWith(validUserId, mockCallback);
    });

    it('should handle subscription errors', () => {
      const mockCallback = jest.fn();
      const error = new Error('Failed to subscribe to updates');

      mockOrchestrator.subscribeToUpdates.mockImplementation(() => {
        throw error;
      });

      expect(() => service.subscribeToUpdates(validUserId, mockCallback))
        .toThrow('Failed to subscribe to updates');
    });
  });

  describe('Quick Actions', () => {
    const validUserId = 'test-admin-user';

    it('should execute quick action successfully', async () => {
      const actionType = 'suspend_user';
      const parameters = { userId: 'target-user-123' };
      const expectedResult = { success: true, userId: 'target-user-123' };

      mockOrchestrator.executeQuickAction.mockResolvedValue(expectedResult);

      const result = await service.executeQuickAction(validUserId, actionType, parameters);

      expect(result).toEqual(expectedResult);
      expect(mockOrchestrator.executeQuickAction)
        .toHaveBeenCalledWith(validUserId, actionType, parameters);
    });

    it('should handle permission errors for quick actions', async () => {
      const actionType = 'delete_user';
      const parameters = { userId: 'target-user-123' };
      const error = new Error('Insufficient permissions for action: delete_user');

      mockOrchestrator.executeQuickAction.mockRejectedValue(error);

      await expect(service.executeQuickAction(validUserId, actionType, parameters))
        .rejects.toThrow('Insufficient permissions for action: delete_user');
    });

    it('should handle unknown quick actions', async () => {
      const actionType = 'unknown_action';
      const parameters = {};
      const error = new Error('Unknown quick action: unknown_action');

      mockOrchestrator.executeQuickAction.mockRejectedValue(error);

      await expect(service.executeQuickAction(validUserId, actionType, parameters))
        .rejects.toThrow('Unknown quick action: unknown_action');
    });
  });

  describe('Health Check', () => {
    it('should return health status successfully', async () => {
      const expectedHealth = {
        status: 'healthy',
        timestamp: new Date(),
        metrics: { components: {} }
      };

      mockOrchestrator.getHealth.mockResolvedValue(expectedHealth);

      const health = await service.getHealth();

      expect(health).toEqual(expectedHealth);
      expect(mockOrchestrator.getHealth).toHaveBeenCalledTimes(1);
    });

    it('should handle health check errors', async () => {
      const error = new Error('Health check failed');
      mockOrchestrator.getHealth.mockRejectedValue(error);

      await expect(service.getHealth()).rejects.toThrow('Health check failed');
    });
  });
});
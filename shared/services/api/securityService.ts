/**
 * Security Service
 *
 * Handles security-related operations:
 * - Connected devices management
 * - Login history
 * - Two-factor authentication
 * - Biometric settings
 */

import { api } from './client';
import type { ApiResponse } from './types';

export interface ConnectedDevice {
  id: string;
  name: string;
  type: 'mobile' | 'tablet' | 'tv' | 'web' | 'unknown';
  lastActive: string;
  isCurrent: boolean;
  location?: string;
  platform?: string;
}

export interface LoginHistory {
  id: string;
  device: string;
  location: string;
  timestamp: string;
  success: boolean;
  ip_address?: string;
}

export interface SecuritySettings {
  twoFactorEnabled: boolean;
  biometricEnabled: boolean;
  lastPasswordChange: string;
  loginNotifications: boolean;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export const securityService = {
  /**
   * Get all connected devices for the current user
   */
  async getConnectedDevices(): Promise<ConnectedDevice[]> {
    try {
      const response = await api.get<ApiResponse<ConnectedDevice[]>>(
        '/api/v1/security/devices'
      );
      return response.data.data || [];
    } catch (error) {
      console.error('Failed to fetch connected devices:', error);
      return [];
    }
  },

  /**
   * Get login history for the current user
   */
  async getLoginHistory(): Promise<LoginHistory[]> {
    try {
      const response = await api.get<ApiResponse<LoginHistory[]>>(
        '/api/v1/security/login-history'
      );
      return response.data.data || [];
    } catch (error) {
      console.error('Failed to fetch login history:', error);
      return [];
    }
  },

  /**
   * Get security settings for the current user
   */
  async getSecuritySettings(): Promise<SecuritySettings> {
    try {
      const response = await api.get<ApiResponse<SecuritySettings>>(
        '/api/v1/security/settings'
      );
      return response.data.data || {
        twoFactorEnabled: false,
        biometricEnabled: false,
        lastPasswordChange: new Date().toISOString(),
        loginNotifications: true,
      };
    } catch (error) {
      console.error('Failed to fetch security settings:', error);
      return {
        twoFactorEnabled: false,
        biometricEnabled: false,
        lastPasswordChange: new Date().toISOString(),
        loginNotifications: true,
      };
    }
  },

  /**
   * Enable two-factor authentication
   */
  async enableTwoFactor(): Promise<{ secret: string; qrCode: string }> {
    const response = await api.post<ApiResponse<{ secret: string; qrCode: string }>>(
      '/api/v1/security/2fa/enable'
    );
    return response.data.data || { secret: '', qrCode: '' };
  },

  /**
   * Disable two-factor authentication
   */
  async disableTwoFactor(): Promise<void> {
    await api.post('/api/v1/security/2fa/disable');
  },

  /**
   * Verify two-factor authentication code
   */
  async verifyTwoFactor(code: string): Promise<boolean> {
    try {
      await api.post('/api/v1/security/2fa/verify', { code });
      return true;
    } catch (error) {
      return false;
    }
  },

  /**
   * Enable biometric authentication for the current device
   */
  async enableBiometric(): Promise<void> {
    await api.post('/api/v1/security/biometric/enable');
  },

  /**
   * Disable biometric authentication for the current device
   */
  async disableBiometric(): Promise<void> {
    await api.post('/api/v1/security/biometric/disable');
  },

  /**
   * Change password
   */
  async changePassword(request: ChangePasswordRequest): Promise<void> {
    await api.post('/api/v1/security/password/change', request);
  },

  /**
   * Remove a connected device
   */
  async removeDevice(deviceId: string): Promise<void> {
    await api.delete(`/api/v1/security/devices/${deviceId}`);
  },

  /**
   * Sign out from all devices
   */
  async signOutAllDevices(): Promise<void> {
    await api.post('/api/v1/security/sign-out-all');
  },

  /**
   * Toggle login notifications
   */
  async toggleLoginNotifications(enabled: boolean): Promise<void> {
    await api.post('/api/v1/security/notifications', { enabled });
  },
};

export default securityService;

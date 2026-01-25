/**
 * Device Service
 * API client for device management endpoints
 */

import axios from 'axios';

interface DeviceInfo {
  device_id: string;
  device_name: string;
  device_type: string;
  browser?: string;
  os?: string;
  platform?: string;
  ip_address?: string;
}

interface Device {
  device_id: string;
  device_name: string;
  device_type: string;
  browser: string | null;
  os: string | null;
  platform: string | null;
  last_active: string;
  registered_at: string;
  is_current: boolean;
}

interface DeviceListResponse {
  devices: Device[];
  total: number;
}

interface DisconnectResponse {
  success: boolean;
  message: string;
  terminated_sessions: number;
}

class DeviceService {
  private readonly baseUrl = '/api/v1/devices';

  /**
   * Get all registered devices for the current user
   */
  async listDevices(): Promise<DeviceListResponse> {
    const response = await axios.get<DeviceListResponse>(this.baseUrl);
    return response.data;
  }

  /**
   * Register or update a device
   */
  async registerDevice(deviceInfo: DeviceInfo): Promise<Device> {
    const response = await axios.post<Device>(`${this.baseUrl}/register`, deviceInfo);
    return response.data;
  }

  /**
   * Unregister a device and terminate its active sessions
   */
  async unregisterDevice(deviceId: string): Promise<DisconnectResponse> {
    const response = await axios.delete<DisconnectResponse>(`${this.baseUrl}/${deviceId}`);
    return response.data;
  }

  /**
   * Update device activity heartbeat
   */
  async updateHeartbeat(deviceId: string): Promise<void> {
    await axios.post(`${this.baseUrl}/heartbeat`, { device_id: deviceId });
  }

  /**
   * Generate a unique device ID from device fingerprint
   * Uses SHA-256 hash of user agent + screen + platform
   */
  async generateDeviceId(): Promise<string> {
    const userAgent = navigator.userAgent;
    const screen = `${window.screen.width}x${window.screen.height}`;
    const platform = navigator.platform;

    // Create fingerprint string
    const fingerprint = `${userAgent}|${screen}|${platform}`;

    // Hash using Web Crypto API
    const encoder = new TextEncoder();
    const data = encoder.encode(fingerprint);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);

    // Convert to hex string
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    return hashHex;
  }

  /**
   * Get human-readable device name
   */
  getDeviceName(): string {
    const userAgent = navigator.userAgent;

    // Detect device type and model
    if (/iPhone/i.test(userAgent)) {
      // Try to extract iPhone model
      const match = userAgent.match(/iPhone\s+OS\s+(\d+)/);
      if (match) {
        return `iPhone (iOS ${match[1]})`;
      }
      return 'iPhone';
    } else if (/iPad/i.test(userAgent)) {
      return 'iPad';
    } else if (/Android/i.test(userAgent)) {
      // Try to extract Android device name
      const match = userAgent.match(/Android\s+([\d.]+);?\s*([^)]+)?/);
      if (match && match[2]) {
        return match[2].trim();
      }
      return 'Android Device';
    } else if (/Windows/i.test(userAgent)) {
      // Browser on Windows
      const browser = this.getBrowserName();
      return `${browser} on Windows`;
    } else if (/Mac/i.test(userAgent)) {
      const browser = this.getBrowserName();
      return `${browser} on macOS`;
    } else if (/Linux/i.test(userAgent)) {
      const browser = this.getBrowserName();
      return `${browser} on Linux`;
    }

    return 'Unknown Device';
  }

  /**
   * Get browser name
   */
  private getBrowserName(): string {
    const userAgent = navigator.userAgent;

    if (/Edg/i.test(userAgent)) return 'Edge';
    if (/Chrome/i.test(userAgent)) return 'Chrome';
    if (/Safari/i.test(userAgent) && !/Chrome/i.test(userAgent)) return 'Safari';
    if (/Firefox/i.test(userAgent)) return 'Firefox';
    if (/Opera|OPR/i.test(userAgent)) return 'Opera';

    return 'Browser';
  }

  /**
   * Get device type
   */
  getDeviceType(): string {
    const userAgent = navigator.userAgent;

    if (/iPad/i.test(userAgent)) return 'tablet';
    if (/iPhone/i.test(userAgent)) return 'mobile';
    if (/Android/i.test(userAgent) && /Mobile/i.test(userAgent)) return 'mobile';
    if (/Android/i.test(userAgent)) return 'tablet';
    if (/Windows Phone/i.test(userAgent)) return 'mobile';

    return 'desktop';
  }

  /**
   * Get OS name
   */
  getOSName(): string {
    const userAgent = navigator.userAgent;

    if (/iPhone|iPad|iPod/i.test(userAgent)) {
      const match = userAgent.match(/OS\s+([\d_]+)/);
      if (match) {
        const version = match[1].replace(/_/g, '.');
        return `iOS ${version}`;
      }
      return 'iOS';
    }

    if (/Android/i.test(userAgent)) {
      const match = userAgent.match(/Android\s+([\d.]+)/);
      if (match) {
        return `Android ${match[1]}`;
      }
      return 'Android';
    }

    if (/Windows NT/i.test(userAgent)) {
      const match = userAgent.match(/Windows NT\s+([\d.]+)/);
      if (match) {
        const version = match[1];
        if (version === '10.0') return 'Windows 11';
        if (version === '6.3') return 'Windows 8.1';
        if (version === '6.2') return 'Windows 8';
        if (version === '6.1') return 'Windows 7';
        return `Windows NT ${version}`;
      }
      return 'Windows';
    }

    if (/Mac/i.test(userAgent)) {
      const match = userAgent.match(/Mac OS X\s+([\d_]+)/);
      if (match) {
        const version = match[1].replace(/_/g, '.');
        return `macOS ${version}`;
      }
      return 'macOS';
    }

    if (/Linux/i.test(userAgent)) return 'Linux';

    return 'Unknown OS';
  }

  /**
   * Get platform identifier
   */
  getPlatform(): string {
    const userAgent = navigator.userAgent;

    if (/iPhone|iPad|iPod/i.test(userAgent)) return 'iOS';
    if (/Android/i.test(userAgent)) return 'Android';
    if (/Windows/i.test(userAgent)) return 'Web';
    if (/Mac|Linux/i.test(userAgent)) return 'Web';

    return 'Web';
  }

  /**
   * Get current device IP address (from request headers)
   * Note: This is placeholder - actual IP detection happens on backend
   */
  async getIPAddress(): Promise<string | null> {
    try {
      // In production, backend will capture IP from request headers
      // This is just a placeholder for the device registration payload
      return null;
    } catch {
      return null;
    }
  }
}

// Singleton instance
export const deviceService = new DeviceService();

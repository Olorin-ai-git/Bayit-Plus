import { BaseApiService } from './BaseApiService';
import { env } from '../config/env.config';

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface NotificationSettings {
  email: boolean;
  push: boolean;
  investigations: boolean;
  reports: boolean;
  system: boolean;
}

export interface ChangePasswordResponse {
  success: boolean;
  message: string;
}

export interface UpdateNotificationSettingsResponse {
  success: boolean;
  settings: NotificationSettings;
}

export class UserApiService extends BaseApiService {
  constructor() {
    super(env.apiBaseUrl);
  }

  async changePassword(request: ChangePasswordRequest): Promise<ChangePasswordResponse> {
    return this.post<ChangePasswordResponse>('/api/user/change-password', request);
  }

  async updateNotificationSettings(settings: NotificationSettings): Promise<UpdateNotificationSettingsResponse> {
    return this.post<UpdateNotificationSettingsResponse>('/api/user/notification-settings', settings);
  }

  async getNotificationSettings(): Promise<NotificationSettings> {
    return this.get<NotificationSettings>('/api/user/notification-settings');
  }
}

export const userApiService = new UserApiService();

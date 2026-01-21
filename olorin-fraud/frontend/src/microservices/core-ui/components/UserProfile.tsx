import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useEventEmitter } from '@shared/events/UnifiedEventBus';
import { userApiService } from '../../../shared/services/UserApiService';
import {
  UserCircleIcon,
  KeyIcon,
  BellIcon,
  ShieldCheckIcon,
  ArrowRightOnRectangleIcon,
  PhotoIcon,
  CheckIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

interface UserProfileProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ProfileFormData {
  name: string;
  email: string;
  avatar?: string;
}

interface PasswordFormData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface NotificationSettings {
  emailNotifications: boolean;
  pushNotifications: boolean;
  investigationUpdates: boolean;
  agentProgress: boolean;
  reportGeneration: boolean;
  systemAlerts: boolean;
}

export const UserProfile: React.FC<UserProfileProps> = ({ isOpen, onClose }) => {
  const { user, logout, updateProfile } = useAuth();
  const { emitNotification } = useEventEmitter();

  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'notifications'>('profile');
  const [isLoading, setIsLoading] = useState(false);

  // Profile form state
  const [profileData, setProfileData] = useState<ProfileFormData>({
    name: user?.name || '',
    email: user?.email || '',
    avatar: user?.avatar || '',
  });

  // Password form state
  const [passwordData, setPasswordData] = useState<PasswordFormData>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // Notification settings state
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    emailNotifications: true,
    pushNotifications: true,
    investigationUpdates: true,
    agentProgress: false,
    reportGeneration: true,
    systemAlerts: true,
  });

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await updateProfile({
        name: profileData.name,
        email: profileData.email,
        ...(profileData.avatar !== undefined && { avatar: profileData.avatar }),
      });

      emitNotification('success', 'Profile updated successfully');
    } catch (error) {
      emitNotification('error', 'Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      emitNotification('error', 'New passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 8) {
      emitNotification('error', 'Password must be at least 8 characters long');
      return;
    }

    setIsLoading(true);

    try {
      await userApiService.changePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });

      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });

      emitNotification('success', 'Password changed successfully');
    } catch (error) {
      emitNotification('error', 'Failed to change password');
    } finally {
      setIsLoading(false);
    }
  };

  const handleNotificationSettingsSubmit = async () => {
    setIsLoading(true);

    try {
      await userApiService.updateNotificationSettings(notificationSettings);

      emitNotification('success', 'Notification settings updated');
    } catch (error) {
      emitNotification('error', 'Failed to update notification settings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      onClose();
    } catch (error) {
      emitNotification('error', 'Failed to logout');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={onClose} />

        <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">User Profile</h2>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-md"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex">
              {[
                { key: 'profile', label: 'Profile', icon: UserCircleIcon },
                { key: 'security', label: 'Security', icon: ShieldCheckIcon },
                { key: 'notifications', label: 'Notifications', icon: BellIcon },
              ].map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key as any)}
                  className={`
                    flex items-center px-6 py-3 text-sm font-medium border-b-2 transition-colors duration-150
                    ${activeTab === key
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }
                  `}
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {label}
                </button>
              ))}
            </nav>
          </div>

          {/* Content */}
          <div className="p-6">
            {activeTab === 'profile' && (
              <form onSubmit={handleProfileSubmit} className="space-y-6">
                <div className="flex items-center space-x-6">
                  <div className="flex-shrink-0">
                    {user?.avatar ? (
                      <img
                        src={user.avatar}
                        alt="Profile"
                        className="h-16 w-16 rounded-full object-cover"
                      />
                    ) : (
                      <UserCircleIcon className="h-16 w-16 text-gray-400" />
                    )}
                  </div>
                  <div>
                    <button
                      type="button"
                      className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      <PhotoIcon className="h-4 w-4 mr-2" />
                      Change Photo
                    </button>
                    <p className="mt-2 text-xs text-gray-500">
                      JPG, GIF or PNG. 1MB max.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={profileData.name}
                      onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={profileData.email}
                      onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Role
                  </label>
                  <input
                    type="text"
                    value={user?.role || 'User'}
                    disabled
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 text-gray-500 sm:text-sm"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Contact your administrator to change your role.
                  </p>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    {isLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <CheckIcon className="h-4 w-4 mr-2" />
                        Save Changes
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {activeTab === 'security' && (
              <div className="space-y-6">
                <form onSubmit={handlePasswordSubmit} className="space-y-6">
                  <h3 className="text-lg font-medium text-gray-900">Change Password</h3>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Current Password
                    </label>
                    <input
                      type="password"
                      value={passwordData.currentPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      New Password
                    </label>
                    <input
                      type="password"
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      required
                      minLength={8}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      required
                      minLength={8}
                    />
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                    >
                      {isLoading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                          Changing...
                        </>
                      ) : (
                        <>
                          <KeyIcon className="h-4 w-4 mr-2" />
                          Change Password
                        </>
                      )}
                    </button>
                  </div>
                </form>

                <div className="pt-6 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">Sign Out</h3>
                      <p className="text-sm text-gray-500">
                        Sign out of your account on this device.
                      </p>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      <ArrowRightOnRectangleIcon className="h-4 w-4 mr-2" />
                      Sign Out
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div className="space-y-6">
                <h3 className="text-lg font-medium text-gray-900">Notification Preferences</h3>

                <div className="space-y-4">
                  {[
                    { key: 'emailNotifications', label: 'Email Notifications', description: 'Receive notifications via email' },
                    { key: 'pushNotifications', label: 'Push Notifications', description: 'Receive browser push notifications' },
                    { key: 'investigationUpdates', label: 'Investigation Updates', description: 'Notifications when investigations are completed' },
                    { key: 'agentProgress', label: 'Agent Progress', description: 'Real-time updates on agent analysis progress' },
                    { key: 'reportGeneration', label: 'Report Generation', description: 'Notifications when reports are ready' },
                    { key: 'systemAlerts', label: 'System Alerts', description: 'Important system notifications and warnings' },
                  ].map(({ key, label, description }) => (
                    <div key={key} className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">{label}</h4>
                        <p className="text-sm text-gray-500">{description}</p>
                      </div>
                      <div className="ml-4">
                        <button
                          type="button"
                          onClick={() => setNotificationSettings(prev => ({
                            ...prev,
                            [key]: !prev[key as keyof NotificationSettings]
                          }))}
                          className={`
                            relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                            ${notificationSettings[key as keyof NotificationSettings] ? 'bg-blue-600' : 'bg-gray-200'}
                          `}
                        >
                          <span
                            className={`
                              pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out
                              ${notificationSettings[key as keyof NotificationSettings] ? 'translate-x-5' : 'translate-x-0'}
                            `}
                          />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={handleNotificationSettingsSubmit}
                    disabled={isLoading}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    {isLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <CheckIcon className="h-4 w-4 mr-2" />
                        Save Preferences
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
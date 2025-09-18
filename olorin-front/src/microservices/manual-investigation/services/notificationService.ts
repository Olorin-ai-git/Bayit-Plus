import { NotificationSettings } from '../types/manualInvestigation';

interface Notification {
  id: string;
  type: 'step_assigned' | 'step_completed' | 'evidence_added' | 'review_required' | 'status_changed' | 'due_date' | 'mention' | 'comment_added' | 'investigation_updated';
  title: string;
  message: string;
  investigationId: string;
  investigationTitle: string;
  relatedEntityId?: string;
  relatedEntityType?: 'step' | 'evidence' | 'comment';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  timestamp: string;
  isRead: boolean;
  actionUrl?: string;
  actionText?: string;
  metadata?: Record<string, any>;
}

interface NotificationTemplate {
  type: Notification['type'];
  titleTemplate: string;
  messageTemplate: string;
  priority: Notification['priority'];
  shouldSendEmail: boolean;
  shouldSendPush: boolean;
  shouldShowInApp: boolean;
}

interface PushSubscription {
  endpoint: string;
  keys: {
    auth: string;
    p256dh: string;
  };
}

type NotificationCallback = (notification: Notification) => void;

class NotificationService {
  private notifications: Notification[] = [];
  private callbacks: NotificationCallback[] = [];
  private settings: NotificationSettings = {
    stepAssigned: true,
    stepCompleted: true,
    evidenceAdded: true,
    reviewRequired: true,
    statusChanged: true,
    dueDate: true,
    mentions: true
  };
  private pushSubscription: PushSubscription | null = null;
  private serviceWorkerRegistration: ServiceWorkerRegistration | null = null;

  private templates: Record<Notification['type'], NotificationTemplate> = {
    step_assigned: {
      type: 'step_assigned',
      titleTemplate: 'New Step Assigned',
      messageTemplate: 'You have been assigned to step "{stepTitle}" in investigation "{investigationTitle}"',
      priority: 'medium',
      shouldSendEmail: true,
      shouldSendPush: true,
      shouldShowInApp: true
    },
    step_completed: {
      type: 'step_completed',
      titleTemplate: 'Step Completed',
      messageTemplate: 'Step "{stepTitle}" has been completed in investigation "{investigationTitle}"',
      priority: 'low',
      shouldSendEmail: false,
      shouldSendPush: true,
      shouldShowInApp: true
    },
    evidence_added: {
      type: 'evidence_added',
      titleTemplate: 'New Evidence Added',
      messageTemplate: 'Evidence "{evidenceTitle}" has been added to investigation "{investigationTitle}"',
      priority: 'medium',
      shouldSendEmail: true,
      shouldSendPush: true,
      shouldShowInApp: true
    },
    review_required: {
      type: 'review_required',
      titleTemplate: 'Review Required',
      messageTemplate: 'Investigation "{investigationTitle}" requires your review',
      priority: 'high',
      shouldSendEmail: true,
      shouldSendPush: true,
      shouldShowInApp: true
    },
    status_changed: {
      type: 'status_changed',
      titleTemplate: 'Status Changed',
      messageTemplate: 'Investigation "{investigationTitle}" status changed to {newStatus}',
      priority: 'medium',
      shouldSendEmail: true,
      shouldSendPush: true,
      shouldShowInApp: true
    },
    due_date: {
      type: 'due_date',
      titleTemplate: 'Due Date Reminder',
      messageTemplate: 'Investigation "{investigationTitle}" is due {dueTime}',
      priority: 'urgent',
      shouldSendEmail: true,
      shouldSendPush: true,
      shouldShowInApp: true
    },
    mention: {
      type: 'mention',
      titleTemplate: 'You were mentioned',
      messageTemplate: '{userName} mentioned you in investigation "{investigationTitle}"',
      priority: 'high',
      shouldSendEmail: true,
      shouldSendPush: true,
      shouldShowInApp: true
    },
    comment_added: {
      type: 'comment_added',
      titleTemplate: 'New Comment',
      messageTemplate: '{userName} added a comment to investigation "{investigationTitle}"',
      priority: 'low',
      shouldSendEmail: false,
      shouldSendPush: true,
      shouldShowInApp: true
    },
    investigation_updated: {
      type: 'investigation_updated',
      titleTemplate: 'Investigation Updated',
      messageTemplate: 'Investigation "{investigationTitle}" has been updated',
      priority: 'low',
      shouldSendEmail: false,
      shouldSendPush: false,
      shouldShowInApp: true
    }
  };

  constructor() {
    this.loadNotifications();
    this.loadSettings();
    this.requestNotificationPermission();
    this.registerServiceWorker();
  }

  // Core notification methods
  async createNotification(data: {
    type: Notification['type'];
    investigationId: string;
    investigationTitle: string;
    relatedEntityId?: string;
    relatedEntityType?: 'step' | 'evidence' | 'comment';
    variables?: Record<string, string>;
    priority?: Notification['priority'];
    actionUrl?: string;
    actionText?: string;
    metadata?: Record<string, any>;
  }): Promise<Notification> {
    const template = this.templates[data.type];

    if (!this.shouldShowNotification(data.type)) {
      console.log(`Notification type ${data.type} is disabled`);
      return Promise.reject('Notification type disabled');
    }

    const notification: Notification = {
      id: this.generateNotificationId(),
      type: data.type,
      title: this.processTemplate(template.titleTemplate, data.variables || {}),
      message: this.processTemplate(template.messageTemplate, {
        investigationTitle: data.investigationTitle,
        ...data.variables
      }),
      investigationId: data.investigationId,
      investigationTitle: data.investigationTitle,
      relatedEntityId: data.relatedEntityId,
      relatedEntityType: data.relatedEntityType,
      priority: data.priority || template.priority,
      timestamp: new Date().toISOString(),
      isRead: false,
      actionUrl: data.actionUrl,
      actionText: data.actionText,
      metadata: data.metadata
    };

    this.notifications.unshift(notification);
    this.saveNotifications();

    // Show in-app notification
    if (template.shouldShowInApp) {
      this.showInAppNotification(notification);
    }

    // Send push notification
    if (template.shouldSendPush && this.pushSubscription) {
      await this.sendPushNotification(notification);
    }

    // Send email notification
    if (template.shouldSendEmail) {
      await this.sendEmailNotification(notification);
    }

    // Notify callbacks
    this.notifyCallbacks(notification);

    return notification;
  }

  private processTemplate(template: string, variables: Record<string, string>): string {
    let result = template;
    Object.entries(variables).forEach(([key, value]) => {
      result = result.replace(new RegExp(`{${key}}`, 'g'), value);
    });
    return result;
  }

  private shouldShowNotification(type: Notification['type']): boolean {
    switch (type) {
      case 'step_assigned':
        return this.settings.stepAssigned;
      case 'step_completed':
        return this.settings.stepCompleted;
      case 'evidence_added':
        return this.settings.evidenceAdded;
      case 'review_required':
        return this.settings.reviewRequired;
      case 'status_changed':
        return this.settings.statusChanged;
      case 'due_date':
        return this.settings.dueDate;
      case 'mention':
        return this.settings.mentions;
      default:
        return true;
    }
  }

  // Notification display methods
  private showInAppNotification(notification: Notification): void {
    // Show toast notification
    this.showToast(notification);

    // Update browser notification count
    this.updateBrowserBadge();
  }

  private showToast(notification: Notification): void {
    // Create toast element
    const toast = document.createElement('div');
    toast.className = this.getToastClassName(notification.priority);
    toast.innerHTML = `
      <div class="flex items-start">
        <div class="flex-shrink-0">
          ${this.getNotificationIcon(notification.type)}
        </div>
        <div class="ml-3 w-0 flex-1">
          <p class="text-sm font-medium text-gray-900">${notification.title}</p>
          <p class="mt-1 text-sm text-gray-500">${notification.message}</p>
          ${notification.actionUrl ? `
            <div class="mt-2">
              <a href="${notification.actionUrl}" class="text-sm text-blue-600 hover:text-blue-500">
                ${notification.actionText || 'View'}
              </a>
            </div>
          ` : ''}
        </div>
        <div class="ml-4 flex-shrink-0 flex">
          <button class="toast-close bg-white rounded-md inline-flex text-gray-400 hover:text-gray-500">
            <span class="sr-only">Close</span>
            <svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
            </svg>
          </button>
        </div>
      </div>
    `;

    // Add to page
    const container = this.getToastContainer();
    container.appendChild(toast);

    // Add close handler
    const closeButton = toast.querySelector('.toast-close');
    closeButton?.addEventListener('click', () => {
      toast.remove();
    });

    // Auto remove after delay
    const delay = notification.priority === 'urgent' ? 10000 : 5000;
    setTimeout(() => {
      toast.remove();
    }, delay);
  }

  private getToastClassName(priority: Notification['priority']): string {
    const baseClasses = 'max-w-sm w-full bg-white shadow-lg rounded-lg pointer-events-auto mb-4 border';
    switch (priority) {
      case 'urgent':
        return `${baseClasses} border-red-200 ring-1 ring-red-400`;
      case 'high':
        return `${baseClasses} border-orange-200 ring-1 ring-orange-400`;
      case 'medium':
        return `${baseClasses} border-blue-200 ring-1 ring-blue-400`;
      case 'low':
        return `${baseClasses} border-gray-200`;
      default:
        return `${baseClasses} border-gray-200`;
    }
  }

  private getNotificationIcon(type: Notification['type']): string {
    const iconClasses = 'h-6 w-6';
    switch (type) {
      case 'step_assigned':
        return `<svg class="${iconClasses} text-blue-500" fill="currentColor" viewBox="0 0 20 20"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`;
      case 'evidence_added':
        return `<svg class="${iconClasses} text-green-500" fill="currentColor" viewBox="0 0 20 20"><path d="M4 3a2 2 0 100 4h12a2 2 0 100-4H4z"></path><path fill-rule="evenodd" d="M3 8h14v7a2 2 0 01-2 2H5a2 2 0 01-2-2V8zm5 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" clip-rule="evenodd"></path></svg>`;
      case 'review_required':
        return `<svg class="${iconClasses} text-amber-500" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path></svg>`;
      case 'mention':
        return `<svg class="${iconClasses} text-purple-500" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M18 13V5a2 2 0 00-2-2H4a2 2 0 00-2 2v8a2 2 0 002 2h3l3 3 3-3h3a2 2 0 002-2zM5 7a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1zm1 3a1 1 0 100 2h3a1 1 0 100-2H6z" clip-rule="evenodd"></path></svg>`;
      default:
        return `<svg class="${iconClasses} text-gray-500" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"></path></svg>`;
    }
  }

  private getToastContainer(): HTMLElement {
    let container = document.getElementById('notification-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'notification-container';
      container.className = 'fixed top-4 right-4 z-50 pointer-events-none';
      document.body.appendChild(container);
    }
    return container;
  }

  // Push notifications
  private async sendPushNotification(notification: Notification): Promise<void> {
    if (!this.serviceWorkerRegistration || !this.pushSubscription) {
      console.warn('Push notifications not available');
      return;
    }

    try {
      await fetch('/api/notifications/push', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken') || ''}`
        },
        body: JSON.stringify({
          subscription: this.pushSubscription,
          notification: {
            title: notification.title,
            body: notification.message,
            icon: '/icons/notification-icon.png',
            badge: '/icons/badge-icon.png',
            tag: notification.investigationId,
            data: {
              notificationId: notification.id,
              investigationId: notification.investigationId,
              actionUrl: notification.actionUrl
            }
          }
        })
      });
    } catch (error) {
      console.error('Failed to send push notification:', error);
    }
  }

  private async sendEmailNotification(notification: Notification): Promise<void> {
    try {
      await fetch('/api/notifications/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken') || ''}`
        },
        body: JSON.stringify({
          notification,
          template: this.templates[notification.type]
        })
      });
    } catch (error) {
      console.error('Failed to send email notification:', error);
    }
  }

  // Service Worker setup
  private async registerServiceWorker(): Promise<void> {
    if ('serviceWorker' in navigator) {
      try {
        this.serviceWorkerRegistration = await navigator.serviceWorker.register('/sw.js');
        console.log('Service Worker registered');

        // Request push subscription
        await this.subscribeToPush();
      } catch (error) {
        console.error('Service Worker registration failed:', error);
      }
    }
  }

  private async subscribeToPush(): Promise<void> {
    if (!this.serviceWorkerRegistration) return;

    try {
      const subscription = await this.serviceWorkerRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(
          process.env.REACT_APP_VAPID_PUBLIC_KEY || ''
        )
      });

      this.pushSubscription = {
        endpoint: subscription.endpoint,
        keys: {
          auth: this.arrayBufferToBase64(subscription.getKey('auth')!),
          p256dh: this.arrayBufferToBase64(subscription.getKey('p256dh')!)
        }
      };

      // Send subscription to server
      await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken') || ''}`
        },
        body: JSON.stringify(this.pushSubscription)
      });

      console.log('Push subscription successful');
    } catch (error) {
      console.error('Push subscription failed:', error);
    }
  }

  private async requestNotificationPermission(): Promise<void> {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        console.warn('Notification permission denied');
      }
    }
  }

  private updateBrowserBadge(): void {
    const unreadCount = this.getUnreadCount();

    if ('navigator' in window && 'setAppBadge' in navigator) {
      (navigator as any).setAppBadge(unreadCount);
    }

    // Update document title
    const baseTitle = document.title.replace(/^\(\d+\)\s/, '');
    document.title = unreadCount > 0 ? `(${unreadCount}) ${baseTitle}` : baseTitle;
  }

  // Utility methods
  private generateNotificationId(): string {
    return `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }

  // Public API
  getNotifications(limit?: number): Notification[] {
    return limit ? this.notifications.slice(0, limit) : this.notifications;
  }

  getUnreadNotifications(): Notification[] {
    return this.notifications.filter(n => !n.isRead);
  }

  getUnreadCount(): number {
    return this.notifications.filter(n => !n.isRead).length;
  }

  markAsRead(notificationId: string): void {
    const notification = this.notifications.find(n => n.id === notificationId);
    if (notification) {
      notification.isRead = true;
      this.saveNotifications();
      this.updateBrowserBadge();
    }
  }

  markAllAsRead(): void {
    this.notifications.forEach(n => n.isRead = true);
    this.saveNotifications();
    this.updateBrowserBadge();
  }

  deleteNotification(notificationId: string): void {
    this.notifications = this.notifications.filter(n => n.id !== notificationId);
    this.saveNotifications();
    this.updateBrowserBadge();
  }

  clearAllNotifications(): void {
    this.notifications = [];
    this.saveNotifications();
    this.updateBrowserBadge();
  }

  updateSettings(newSettings: NotificationSettings): void {
    this.settings = { ...this.settings, ...newSettings };
    this.saveSettings();
  }

  getSettings(): NotificationSettings {
    return { ...this.settings };
  }

  subscribe(callback: NotificationCallback): () => void {
    this.callbacks.push(callback);

    return () => {
      const index = this.callbacks.indexOf(callback);
      if (index > -1) {
        this.callbacks.splice(index, 1);
      }
    };
  }

  private notifyCallbacks(notification: Notification): void {
    this.callbacks.forEach(callback => {
      try {
        callback(notification);
      } catch (error) {
        console.error('Error in notification callback:', error);
      }
    });
  }

  // Persistence
  private saveNotifications(): void {
    try {
      localStorage.setItem('manual-investigation-notifications', JSON.stringify(this.notifications));
    } catch (error) {
      console.error('Failed to save notifications:', error);
    }
  }

  private loadNotifications(): void {
    try {
      const saved = localStorage.getItem('manual-investigation-notifications');
      if (saved) {
        this.notifications = JSON.parse(saved);
        this.updateBrowserBadge();
      }
    } catch (error) {
      console.error('Failed to load notifications:', error);
      this.notifications = [];
    }
  }

  private saveSettings(): void {
    try {
      localStorage.setItem('manual-investigation-notification-settings', JSON.stringify(this.settings));
    } catch (error) {
      console.error('Failed to save notification settings:', error);
    }
  }

  private loadSettings(): void {
    try {
      const saved = localStorage.getItem('manual-investigation-notification-settings');
      if (saved) {
        this.settings = { ...this.settings, ...JSON.parse(saved) };
      }
    } catch (error) {
      console.error('Failed to load notification settings:', error);
    }
  }
}

// Create singleton instance
export const notificationService = new NotificationService();

// Export types
export type { Notification, NotificationTemplate, NotificationCallback };
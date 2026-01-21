/**
 * Core UI Service Adapter
 * Feature: Navigation, notifications, theme, and modal management
 */

import { BaseServiceAdapter } from '../base/BaseServiceAdapter';
import type { Notification, ThemeConfig, User } from '../../eventBus';

/**
 * Core UI Service Adapter
 * Handles navigation, notifications, theme changes, and modal interactions
 */
export class CoreUIAdapter extends BaseServiceAdapter {
  constructor() {
    super('core-ui');
  }

  protected initialize(): void {
    this.subscribeToEvent('ui:navigation:changed', (data) => {
      this.sendMessage('navigation-changed', data);
    });

    this.subscribeToEvent('ui:notification:show', (data) => {
      this.sendMessage('notification', data);
    });

    this.subscribeToEvent('ui:theme:changed', (data) => {
      this.sendMessage('theme-changed', data);
      this.updateDesignTokens(data.theme);
    });

    this.subscribeToEvent('ui:modal:opened', (data) => {
      this.sendMessage('modal-opened', data);
    });

    this.subscribeToEvent('ui:modal:closed', (data) => {
      this.sendMessage('modal-closed', data);
    });
  }

  /** Navigate to route */
  public navigate(route: string, user: User): void {
    this.emitEvent('ui:navigation:changed', { route, user });
  }

  /** Show notification */
  public showNotification(notification: Notification): void {
    this.emitEvent('ui:notification:show', { notification });
  }

  /** Change theme */
  public changeTheme(theme: ThemeConfig): void {
    this.emitEvent('ui:theme:changed', { theme });
  }

  /** Open modal */
  public openModal(modalId: string, data?: any): void {
    this.emitEvent('ui:modal:opened', { modalId, data });
  }

  /** Close modal */
  public closeModal(modalId: string): void {
    this.emitEvent('ui:modal:closed', { modalId });
  }

  /** Private: Update design tokens based on theme */
  private updateDesignTokens(theme: ThemeConfig): void {
    // This would integrate with the design tokens system
    console.log('Updating design tokens for theme:', theme.mode);
  }
}

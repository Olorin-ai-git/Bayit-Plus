/**
 * Design System Service Adapter
 * Feature: Design tokens, component generation, Figma sync, and validation
 */

import { BaseServiceAdapter } from '../base/BaseServiceAdapter';
import type { DesignTokens, ComponentDefinition, ValidationError } from '../../eventBus';

/**
 * Design System Service Adapter
 * Handles design tokens updates, component generation, Figma synchronization, and validation
 */
export class DesignSystemAdapter extends BaseServiceAdapter {
  constructor() {
    super('design-system');
  }

  protected initialize(): void {
    this.subscribeToEvent('design:tokens:updated', (data) => {
      this.sendMessage('tokens-updated', data);
    });

    this.subscribeToEvent('design:component:generated', (data) => {
      this.sendMessage('component-generated', data);
    });

    this.subscribeToEvent('design:figma:synced', (data) => {
      this.sendMessage('figma-synced', data);
    });

    this.subscribeToEvent('design:validation:failed', (data) => {
      this.sendMessage('validation-failed', data);
      this.emitEvent('ui:notification:show', {
        notification: {
          id: `validation-${Date.now()}`,
          type: 'error',
          title: 'Design Validation Failed',
          message: `Component ${data.componentId} has validation errors`,
          duration: 8000
        }
      });
    });
  }

  /** Update design tokens */
  public updateTokens(tokens: DesignTokens, source: string): void {
    this.emitEvent('design:tokens:updated', { tokens, source });
  }

  /** Generate component */
  public generateComponent(component: ComponentDefinition): void {
    this.emitEvent('design:component:generated', { component });
  }

  /** Sync with Figma */
  public syncFigma(components: string[]): void {
    this.emitEvent('design:figma:synced', { components, timestamp: new Date() });
  }

  /** Report validation failure */
  public reportValidationFailure(componentId: string, errors: ValidationError[]): void {
    this.emitEvent('design:validation:failed', { componentId, errors });
  }
}

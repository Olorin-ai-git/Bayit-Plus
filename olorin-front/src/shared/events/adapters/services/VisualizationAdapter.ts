/**
 * Visualization Service Adapter
 * Feature: Data visualization, graphs, charts, and maps
 */

import { BaseServiceAdapter } from '../base/BaseServiceAdapter';
import type { Location } from '../../eventBus';

/**
 * Visualization Service Adapter
 * Handles graph updates, map locations, and chart data visualization
 */
export class VisualizationAdapter extends BaseServiceAdapter {
  constructor() {
    super('visualization');
  }

  protected initialize(): void {
    this.subscribeToEvent('viz:graph:updated', (data) => {
      this.sendMessage('graph-updated', data);
    });

    this.subscribeToEvent('viz:map:location:added', (data) => {
      this.sendMessage('location-added', data);
    });

    this.subscribeToEvent('viz:chart:data:updated', (data) => {
      this.sendMessage('chart-updated', data);
    });
  }

  /** Update graph visualization */
  public updateGraph(investigationId: string, nodes: any[], edges: any[]): void {
    this.emitEvent('viz:graph:updated', { investigationId, nodes, edges });
  }

  /** Add map location */
  public addLocation(investigationId: string, location: Location): void {
    this.emitEvent('viz:map:location:added', { investigationId, location });
  }

  /** Update chart data */
  public updateChart(chartId: string, data: any): void {
    this.emitEvent('viz:chart:data:updated', { chartId, data });
  }
}

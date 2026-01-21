/**
 * Risk Gauge Exporter
 * Task: T033 - Phase 3: Risk Visualization
 * Feature: 002-visualization-microservice
 *
 * Export functionality for risk gauge data and visualizations.
 * Supports PNG, SVG, and JSON formats with configuration-driven options.
 */

import type { AgentRiskGaugeState } from '@shared/types/AgentRiskGauges';
import { exportSVG, exportPNG, buildFilename, downloadBlob } from './riskGaugeExportHelpers';

/**
 * Export format types
 */
export type ExportFormat = 'png' | 'svg' | 'json' | 'csv';

/**
 * Export configuration options
 */
export interface ExportOptions {
  /** Export format */
  format: ExportFormat;

  /** Filename (without extension) */
  filename: string;

  /** Image quality for PNG (0-1) */
  quality?: number;

  /** Image scale factor for PNG */
  scale?: number;

  /** Include timestamp in filename */
  includeTimestamp?: boolean;

  /** Background color for images (hex) */
  backgroundColor?: string;
}

/**
 * Default export options
 *
 * Uses sensible defaults for image export quality and scale.
 * Quality: 0.95 (high quality PNG, 0-1 range)
 * Scale: 2 (2x for retina displays)
 */
const DEFAULT_EXPORT_OPTIONS: ExportOptions = {
  format: 'png',
  filename: 'risk-gauge-export',
  quality: 0.95,
  scale: 2,
  includeTimestamp: true,
  backgroundColor: '#ffffff',
};

/**
 * Export risk gauge visualization as image
 *
 * @param svgElement - SVG element to export
 * @param options - Export configuration
 */
export async function exportGaugeAsImage(
  svgElement: SVGSVGElement,
  options: Partial<ExportOptions> = {}
): Promise<void> {
  const opts = { ...DEFAULT_EXPORT_OPTIONS, ...options };
  const filename = buildFilename(opts.filename, opts.format, opts.includeTimestamp);

  if (opts.format === 'svg') {
    await exportSVG(svgElement, filename);
  } else if (opts.format === 'png') {
    await exportPNG(svgElement, filename, opts.quality!, opts.scale!, opts.backgroundColor!);
  }
}

/**
 * Export agent risk data as JSON
 *
 * @param agents - Array of agent risk states
 * @param options - Export configuration
 */
export function exportGaugeDataAsJSON(
  agents: AgentRiskGaugeState[],
  options: Partial<ExportOptions> = {}
): void {
  const opts = { ...DEFAULT_EXPORT_OPTIONS, format: 'json' as const, ...options };
  const filename = buildFilename(opts.filename, 'json', opts.includeTimestamp);

  const data = {
    exportedAt: new Date().toISOString(),
    agents: agents.map((agent) => ({
      agentType: agent.agentType,
      agentName: agent.agentName,
      riskScore: agent.riskScore,
      toolsUsed: agent.toolsUsed,
      status: agent.status,
      executionTime: agent.executionTime,
      findingsCount: agent.findingsCount,
      severeMode: agent.severeMode,
      startedAt: agent.startedAt,
      completedAt: agent.completedAt,
    })),
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  downloadBlob(blob, filename);
}

/**
 * Export agent risk data as CSV
 *
 * @param agents - Array of agent risk states
 * @param options - Export configuration
 */
export function exportGaugeDataAsCSV(
  agents: AgentRiskGaugeState[],
  options: Partial<ExportOptions> = {}
): void {
  const opts = { ...DEFAULT_EXPORT_OPTIONS, format: 'csv' as const, ...options };
  const filename = buildFilename(opts.filename, 'csv', opts.includeTimestamp);

  // CSV header
  const headers = [
    'Agent Type',
    'Agent Name',
    'Risk Score',
    'Tools Used',
    'Status',
    'Execution Time (ms)',
    'Findings Count',
    'Severe Mode',
  ];

  // CSV rows
  const rows = agents.map((agent) => [
    agent.agentType,
    agent.agentName,
    agent.riskScore.toString(),
    agent.toolsUsed.toString(),
    agent.status,
    agent.executionTime.toString(),
    agent.findingsCount.toString(),
    agent.severeMode ? 'Yes' : 'No',
  ]);

  const csvContent = [headers, ...rows].map((row) => row.join(',')).join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv' });
  downloadBlob(blob, filename);
}

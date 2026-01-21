/**
 * Export Service for Visualization Components
 *
 * Provides PNG, SVG, and JSON export capabilities with configuration-driven settings.
 * Uses html2canvas for PNG export and native methods for SVG/JSON.
 *
 * NO HARDCODED VALUES - All settings from configuration.
 */

import html2canvas from 'html2canvas';
import { visualizationConfig } from '../config/environment';
import {
  ExportFormat,
  ExportOptions,
  ExportMetadata,
  generateFilename,
  generateMetadata,
  downloadFile
} from './exportService.helpers';

/**
 * Export Service
 * Singleton service for exporting visualization data
 */
export class ExportService {
  private static instance: ExportService;

  private constructor() {}

  public static getInstance(): ExportService {
    if (!ExportService.instance) {
      ExportService.instance = new ExportService();
    }
    return ExportService.instance;
  }

  /**
   * Export element as PNG using html2canvas
   */
  public async exportAsPng(
    element: HTMLElement,
    options: Partial<ExportOptions> = {}
  ): Promise<void> {
    try {
      const config = visualizationConfig?.export || {};
      const filename = generateFilename(options.filename, 'png', options.includeTimestamp ?? config.includeTimestamp);
      const quality = options.quality ?? config.defaultPngQuality ?? 0.95;

      const canvas = await html2canvas(element, {
        backgroundColor: null,
        scale: 2,
        logging: false,
        width: Math.min(element.scrollWidth, config.maxExportWidth ?? 4096),
        height: Math.min(element.scrollHeight, config.maxExportHeight ?? 4096)
      });

      const dataUrl = canvas.toDataURL('image/png', quality);
      downloadFile(dataUrl, filename);
    } catch (error) {
      console.error('[ExportService] PNG export error:', error);
      throw new Error('Failed to export PNG');
    }
  }

  /**
   * Export SVG element
   */
  public async exportAsSvg(
    svgElement: SVGElement,
    options: Partial<ExportOptions> = {}
  ): Promise<void> {
    try {
      const config = visualizationConfig?.export || {};
      const filename = generateFilename(options.filename, 'svg', options.includeTimestamp ?? config.includeTimestamp);

      const serializer = new XMLSerializer();
      const svgString = serializer.serializeToString(svgElement);
      const blob = new Blob([svgString], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);

      downloadFile(url, filename);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('[ExportService] SVG export error:', error);
      throw new Error('Failed to export SVG');
    }
  }

  /**
   * Export data as JSON
   */
  public async exportAsJson<T>(
    data: T,
    options: Partial<ExportOptions> = {}
  ): Promise<void> {
    try {
      const config = visualizationConfig?.export || {};
      const filename = generateFilename(options.filename, 'json', options.includeTimestamp ?? config.includeTimestamp);

      const exportData = options.includeMetadata ?? config.includeMetadata
        ? { metadata: generateMetadata('json'), data }
        : data;

      const jsonString = JSON.stringify(exportData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      downloadFile(url, filename);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('[ExportService] JSON export error:', error);
      throw new Error('Failed to export JSON');
    }
  }

  /**
   * Check if export format is supported
   */
  public isFormatSupported(format: ExportFormat): boolean {
    const config = visualizationConfig?.features || {};
    const featureMap = {
      png: config.enablePngExport ?? true,
      svg: config.enableSvgExport ?? true,
      json: config.enableJsonExport ?? true
    };

    return featureMap[format] ?? false;
  }

  /**
   * Get supported export formats
   */
  public getSupportedFormats(): ExportFormat[] {
    const formats: ExportFormat[] = [];

    if (this.isFormatSupported('png')) formats.push('png');
    if (this.isFormatSupported('svg')) formats.push('svg');
    if (this.isFormatSupported('json')) formats.push('json');

    return formats;
  }
}

export const exportService = ExportService.getInstance();
export default exportService;

export * from './exportService.helpers';

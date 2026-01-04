/**
 * Export/Import Utilities
 * Functions for exporting and importing investigation data
 */

import { Investigation, ExportData } from '../types/investigations';

const EXPORT_VERSION = '1.0.0';

/**
 * Export investigations to JSON
 */
export const exportInvestigations = (investigations: Investigation[]): string => {
  const exportData: ExportData = {
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    investigations
  };

  return JSON.stringify(exportData, null, 2);
};

/**
 * Download investigations as JSON file
 */
export const downloadInvestigations = (investigations: Investigation[], filename?: string): void => {
  const json = exportInvestigations(investigations);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || `investigations-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Import investigations from JSON file
 */
export const importInvestigations = async (file: File): Promise<Investigation[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const data = JSON.parse(text) as ExportData | Investigation[];
        
        // Handle both formats: ExportData or plain array
        let investigations: Investigation[];
        if (Array.isArray(data)) {
          investigations = data;
        } else if (data.investigations && Array.isArray(data.investigations)) {
          investigations = data.investigations;
        } else {
          throw new Error('Invalid file format');
        }

        // Validate investigations structure
        const validInvestigations = investigations.filter(inv => 
          inv.id && inv.name && inv.owner && inv.status
        );

        if (validInvestigations.length === 0) {
          throw new Error('No valid investigations found in file');
        }

        resolve(validInvestigations);
      } catch (err) {
        reject(err instanceof Error ? err : new Error('Failed to parse file'));
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsText(file);
  });
};


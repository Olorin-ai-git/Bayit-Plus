/**
 * Export Utilities
 *
 * Functions for exporting comparison data to JSON and CSV formats.
 *
 * Constitutional Compliance:
 * - All data from API response
 * - No hardcoded formats
 */

import type { ComparisonResponse, ComparisonRequest } from '../types/comparison';
import { comparisonService } from '../services/comparisonService';

export function exportToJSON(data: ComparisonResponse, entity?: { type: string; value: string } | null): void {
  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  
  const entityPart = entity ? `${entity.type}_${entity.value.substring(0, 20)}` : 'global';
  const datePart = new Date().toISOString().split('T')[0];
  link.download = `investigation_comparison_${entityPart}_${datePart}.json`;
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportToCSV(data: ComparisonResponse, entity?: { type: string; value: string } | null): void {
  const rows: string[] = [];
  
  rows.push('Metric,Window A,Window B,Delta');
  rows.push(`Total Transactions,${data.A.total_transactions},${data.B.total_transactions},${data.B.total_transactions - data.A.total_transactions}`);
  rows.push(`Over Threshold,${data.A.over_threshold},${data.B.over_threshold},${data.B.over_threshold - data.A.over_threshold}`);
  rows.push(`TP,${data.A.TP},${data.B.TP},${data.B.TP - data.A.TP}`);
  rows.push(`FP,${data.A.FP},${data.B.FP},${data.B.FP - data.A.FP}`);
  rows.push(`TN,${data.A.TN},${data.B.TN},${data.B.TN - data.A.TN}`);
  rows.push(`FN,${data.A.FN},${data.B.FN},${data.B.FN - data.A.FN}`);
  rows.push(`Precision,${data.A.precision.toFixed(4)},${data.B.precision.toFixed(4)},${data.delta.precision.toFixed(4)}`);
  rows.push(`Recall,${data.A.recall.toFixed(4)},${data.B.recall.toFixed(4)},${data.delta.recall.toFixed(4)}`);
  rows.push(`F1,${data.A.f1.toFixed(4)},${data.B.f1.toFixed(4)},${data.delta.f1.toFixed(4)}`);
  rows.push(`Accuracy,${data.A.accuracy.toFixed(4)},${data.B.accuracy.toFixed(4)},${data.delta.accuracy.toFixed(4)}`);
  rows.push(`Fraud Rate,${data.A.fraud_rate.toFixed(4)},${data.B.fraud_rate.toFixed(4)},${data.delta.fraud_rate.toFixed(4)}`);
  
  if (data.per_merchant && data.per_merchant.length > 0) {
    rows.push('');
    rows.push('Per-Merchant Breakdown');
    rows.push('Merchant ID,Window A TP,Window A FP,Window A TN,Window A FN,Window B TP,Window B FP,Window B TN,Window B FN,Delta Precision,Delta Recall,Delta F1,Delta Accuracy,Delta Fraud Rate');
    
    data.per_merchant.forEach((pm) => {
      const a = pm.A;
      const b = pm.B;
      const delta = pm.delta;
      rows.push([
        pm.merchant_id,
        a.TP || 0, a.FP || 0, a.TN || 0, a.FN || 0,
        b.TP || 0, b.FP || 0, b.TN || 0, b.FN || 0,
        delta.precision?.toFixed(4) || '',
        delta.recall?.toFixed(4) || '',
        delta.f1?.toFixed(4) || '',
        delta.accuracy?.toFixed(4) || '',
        delta.fraud_rate?.toFixed(4) || ''
      ].join(','));
    });
  }

  const csvStr = rows.join('\n');
  const blob = new Blob([csvStr], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  
  const entityPart = entity ? `${entity.type}_${entity.value.substring(0, 20)}` : 'global';
  const datePart = new Date().toISOString().split('T')[0];
  link.download = `investigation_comparison_${entityPart}_${datePart}.csv`;
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function buildSplunkUrl(entity?: { type: string; value: string } | null, data?: ComparisonResponse | null): string | null {
  const splunkUrl = process.env.REACT_APP_SPLUNK_CASE_URL;
  if (!splunkUrl || !data) return null;

  const params = new URLSearchParams();
  if (entity) {
    params.append('entity_type', entity.type);
    params.append('entity_value', entity.value);
  }
  params.append('window_a_start', data.windowA.start);
  params.append('window_a_end', data.windowA.end);
  params.append('window_b_start', data.windowB.start);
  params.append('window_b_end', data.windowB.end);

  return `${splunkUrl}?${params.toString()}`;
}

export function buildJiraUrl(entity?: { type: string; value: string } | null, data?: ComparisonResponse | null): string | null {
  const jiraUrl = process.env.REACT_APP_JIRA_CREATE_TICKET_URL;
  if (!jiraUrl || !data) return null;

  const params = new URLSearchParams();
  if (entity) {
    params.append('summary', `Investigation Comparison: ${entity.type} ${entity.value}`);
  } else {
    params.append('summary', 'Investigation Comparison: Global Analysis');
  }
  params.append('description', data.investigation_summary || 'Investigation comparison results');
  params.append('window_a', `${data.windowA.start} to ${data.windowA.end}`);
  params.append('window_b', `${data.windowB.start} to ${data.windowB.end}`);

  return `${jiraUrl}?${params.toString()}`;
}

export async function exportToHTML(
  request: ComparisonRequest,
  entity?: { type: string; value: string } | null
): Promise<void> {
  try {
    const htmlContent = await comparisonService.compareWindowsHTML(request);
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    
    const entityPart = entity ? `${entity.type}_${entity.value.substring(0, 20)}` : 'global';
    const datePart = new Date().toISOString().split('T')[0];
    link.download = `investigation_comparison_${entityPart}_${datePart}.html`;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Failed to export HTML report:', error);
    throw error;
  }
}


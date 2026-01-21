/**
 * Anomaly Extractors
 * Feature: 007-progress-wizard-page (T018)
 *
 * Extracts anomaly detections from tool execution results.
 */

import { InvestigationProgress, AnomalyDetection } from '../../../../shared/types/investigation';

/**
 * Normalizes severity string to standard values
 */
function normalizeSeverity(severity: string | undefined): 'low' | 'medium' | 'high' | 'critical' {
  if (!severity) return 'low';
  const lower = severity.toLowerCase();
  if (['critical', 'severe'].includes(lower)) return 'critical';
  if (['high', 'elevated'].includes(lower)) return 'high';
  if (['medium', 'moderate'].includes(lower)) return 'medium';
  return 'low';
}

/**
 * Calculates severity score from severity level
 */
function calculateSeverityScore(severity: string | undefined): number {
  const normalized = normalizeSeverity(severity);
  const scores = { low: 25, medium: 50, high: 75, critical: 95 };
  return scores[normalized];
}

/**
 * Extracts anomalies from tool execution results and domain findings
 * Returns top 10 most severe/recent anomalies for radar
 *
 * @param progress - Olorin investigation progress
 * @returns Array of up to 10 anomalies
 */
export function extractAnomalies(progress: InvestigationProgress & { domainFindings?: Record<string, any> }): AnomalyDetection[] {
  const anomalies: AnomalyDetection[] = [];

  // Extract anomalies from domain findings (primary source)
  if (progress.domainFindings) {
    console.log('🔍 [extractAnomalies] Extracting from domain findings:', {
      domainCount: Object.keys(progress.domainFindings).length,
      domains: Object.keys(progress.domainFindings)
    });

    Object.entries(progress.domainFindings).forEach(([domain, finding]: [string, any]) => {
      // CRITICAL: Use camelCase field names (BaseApiService converts snake_case to camelCase)
      const riskScore = finding.llmAnalysis?.riskScore || finding.riskScore || 0;
      const riskIndicators = finding.riskIndicators || [];
      const riskIndicatorsCount = finding.riskIndicatorsCount || 0;

      console.log(`🔍 [extractAnomalies] Domain ${domain}:`, {
        hasRiskScore: !!riskScore,
        riskScore,
        riskScoreCheck: riskScore > 0,
        hasRiskIndicators: riskIndicators.length > 0,
        riskIndicatorsCount,
        riskIndicatorsCountCheck: riskIndicatorsCount > 0,
        willCreateSynthetic: (riskIndicators.length === 0 && (riskScore > 0 || riskIndicatorsCount > 0)),
        riskIndicatorsSample: riskIndicators.slice(0, 2),
        findingKeys: Object.keys(finding),
        fullFinding: finding
      });

      // Handle both array of indicators and count-only scenarios
      if (riskIndicators.length > 0) {
        // Create anomalies from actual risk indicators array
        riskIndicators.forEach((indicator: string, idx: number) => {
          // Determine severity based on risk score
          let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';
          if (riskScore >= 0.8) severity = 'critical';
          else if (riskScore >= 0.6) severity = 'high';
          else if (riskScore >= 0.4) severity = 'medium';

          anomalies.push({
            id: `domain-${domain}-${idx}`,
            type: 'risk_indicator',
            severity,
            severityScore: riskScore * 100,
            entityId: progress.investigationId,
            entityType: 'investigation',
            detectingAgent: domain.charAt(0).toUpperCase() + domain.slice(1),
            detectingTool: `${domain}_analysis`,
            confidence: finding.llmAnalysis?.confidence || finding.confidence || 0.5,
            description: indicator.length > 200 ? indicator.substring(0, 200) + '...' : indicator,
            supportingEvidence: [{
              toolExecutionId: `domain-${domain}`,
              dataPoints: finding.evidence || []
            }],
            detectedAt: finding.persistedAt ? new Date(finding.persistedAt) : new Date()
          });
        });
      } else if (riskScore > 0 || riskIndicatorsCount > 0) {
        // Create synthetic anomaly when we have risk score but no indicators array
        // This handles cases where backend only sends riskIndicatorsCount
        console.log(`🔍 [extractAnomalies] Creating synthetic anomaly for ${domain}:`, {
          riskScore,
          riskIndicatorsCount,
          hasLlmResponsePreview: !!finding.llmResponsePreview
        });

        let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';
        if (riskScore >= 0.8) severity = 'critical';
        else if (riskScore >= 0.6) severity = 'high';
        else if (riskScore >= 0.4) severity = 'medium';

        const description = finding.llmResponsePreview
          ? (finding.llmResponsePreview.length > 200
              ? finding.llmResponsePreview.substring(0, 200) + '...'
              : finding.llmResponsePreview)
          : `${domain} analysis detected ${riskIndicatorsCount} risk indicator(s) with score ${(riskScore * 100).toFixed(0)}%`;

        anomalies.push({
          id: `domain-${domain}-synthetic`,
          type: 'domain_risk',
          severity,
          severityScore: riskScore * 100,
          entityId: progress.investigationId,
          entityType: 'investigation',
          detectingAgent: domain.charAt(0).toUpperCase() + domain.slice(1),
          detectingTool: `${domain}_analysis`,
          confidence: finding.llmConfidence || finding.confidence || 0.5,
          description,
          supportingEvidence: [{
            toolExecutionId: `domain-${domain}`,
            dataPoints: finding.evidence || []
          }],
          detectedAt: finding.persistedAt ? new Date(finding.persistedAt) : new Date()
        });

        console.log(`🔍 [extractAnomalies] Created synthetic anomaly for ${domain}:`, {
          severity,
          riskScore: riskScore * 100,
          description: description.substring(0, 100)
        });
      }
    });

    console.log('🔍 [extractAnomalies] Total anomalies extracted from domain findings:', anomalies.length);
  }

  // Also extract from tool executions (fallback/legacy)
  for (const tool of progress.toolExecutions) {
    if (tool.status !== 'completed' || !tool.result) continue;

    const findings = tool.result.findings || [];
    for (const finding of findings) {
      if (finding.type === 'anomaly' || finding.severity) {
        anomalies.push({
          id: `${tool.id}-${finding.id}`,
          type: finding.type || 'unknown',
          severity: normalizeSeverity(finding.severity),
          severityScore: finding.severityScore || calculateSeverityScore(finding.severity),
          entityId: tool.input.entityId,
          entityType: tool.input.entityType,
          detectingAgent: tool.agentType,
          detectingTool: tool.toolName,
          confidence: finding.confidence || 0.5,
          description: finding.description || '',
          supportingEvidence: [{
            toolExecutionId: tool.id,
            dataPoints: finding.evidence || []
          }],
          detectedAt: tool.completedAt!
        });
      }
    }
  }

  // Sort by severity (critical first) and time (recent first)
  return anomalies
    .sort((a, b) => {
      const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      const severityDiff = severityOrder[b.severity] - severityOrder[a.severity];
      if (severityDiff !== 0) return severityDiff;
      return b.detectedAt.getTime() - a.detectedAt.getTime();
    })
    .slice(0, 10);
}

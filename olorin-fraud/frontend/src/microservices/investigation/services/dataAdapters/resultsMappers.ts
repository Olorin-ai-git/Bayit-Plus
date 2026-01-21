/**
 * Results Data Mappers
 * Feature: 008-live-investigation-updates
 *
 * Maps backend investigation results (after BaseApiService camelCase transformation)
 * to frontend component formats.
 */

import type { 
  TransformedInvestigationResults, 
  TransformedFinding,
  TransformedAgentDecision,
  TransformedEvidence
} from '../../types/resultsTypes';
import type { Finding } from '../../../shared/components';
import type { TimelineEvent, NetworkNode, NetworkEdge } from '../../../shared/components';

/**
 * Maps transformed finding to frontend Finding format
 */
export function mapFindingToFrontend(finding: TransformedFinding): Finding {
  return {
    id: finding.findingId,
    severity: finding.severity,
    category: finding.domain,  // Use domain as category
    title: finding.title,
    description: finding.description,
    affectedEntities: finding.affectedEntities,
    timestamp: finding.timestamp,
    metadata: {
      ...finding.metadata,
      confidenceScore: finding.confidenceScore,
      evidenceIds: finding.evidenceIds
    }
  };
}

/**
 * Maps all findings to frontend format
 */
export function mapFindingsToFrontend(findings: TransformedFinding[]): Finding[] {
  return findings.map(mapFindingToFrontend);
}

/**
 * Calculates findings count by severity
 */
export function calculateFindingsCount(findings: TransformedFinding[]): {
  critical: number;
  high: number;
  medium: number;
  low: number;
} {
  return findings.reduce(
    (counts, finding) => {
      counts[finding.severity] = (counts[finding.severity] || 0) + 1;
      return counts;
    },
    { critical: 0, high: 0, medium: 0, low: 0 }
  );
}

/**
 * Formats duration from milliseconds to human-readable string
 */
export function formatDuration(durationMs: number): string {
  const seconds = Math.floor(durationMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`;
  }
  return `${seconds}s`;
}

/**
 * Maps findings and agent decisions to timeline events
 */
export function mapToTimelineEvents(
  findings: TransformedFinding[],
  agentDecisions: TransformedAgentDecision[]
): TimelineEvent[] {
  const events: TimelineEvent[] = [];

  // Map findings to timeline events
  findings.forEach(finding => {
    const severityToType: Record<string, 'info' | 'warning' | 'critical' | 'success'> = {
      'critical': 'critical',
      'high': 'warning',
      'medium': 'info',
      'low': 'info'
    };

    events.push({
      id: finding.findingId,
      timestamp: finding.timestamp,
      type: severityToType[finding.severity] || 'info',
      title: finding.title,
      description: finding.description,
      metadata: {
        domain: finding.domain,
        affectedEntities: finding.affectedEntities,
        confidenceScore: finding.confidenceScore
      }
    });
  });

  // Map agent decisions to timeline events
  agentDecisions.forEach(decision => {
    events.push({
      id: `decision-${decision.agentName}-${decision.timestamp}`,
      timestamp: decision.timestamp,
      type: decision.confidenceScore > 0.7 ? 'success' : 'info',
      title: `${decision.agentName}: ${decision.decision}`,
      description: decision.rationale,
      metadata: {
        agentName: decision.agentName,
        confidenceScore: decision.confidenceScore,
        supportingEvidence: decision.supportingEvidence
      }
    });
  });

  // Sort by timestamp (newest first)
  return events.sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}

/**
 * Maps findings and evidence to network nodes and edges
 */
export function mapToNetworkGraph(
  findings: TransformedFinding[],
  evidence: TransformedEvidence[],
  entities: Array<{ value: string; type?: string }>
): { nodes: NetworkNode[]; edges: NetworkEdge[] } {
  const nodes: NetworkNode[] = [];
  const edges: NetworkEdge[] = [];
  const nodeIds = new Set<string>();

  // Add entity nodes
  entities.forEach((entity, index) => {
    const nodeId = `entity-${index}`;
    if (!nodeIds.has(nodeId)) {
      nodes.push({
        id: nodeId,
        label: entity.value,
        type: entity.type || 'entity',
        riskScore: 0
      });
      nodeIds.add(nodeId);
    }
  });

  // Add finding nodes and connect to entities
  findings.forEach(finding => {
    const findingNodeId = `finding-${finding.findingId}`;
    if (!nodeIds.has(findingNodeId)) {
      nodes.push({
        id: findingNodeId,
        label: finding.title,
        type: 'finding',
        riskScore: finding.severity === 'critical' ? 90 : 
                  finding.severity === 'high' ? 70 :
                  finding.severity === 'medium' ? 50 : 30
      });
      nodeIds.add(findingNodeId);
    }

    // Connect findings to affected entities
    finding.affectedEntities.forEach((entityValue, idx) => {
      const entityNode = entities.findIndex(e => e.value === entityValue);
      if (entityNode >= 0) {
        edges.push({
          source: `entity-${entityNode}`,
          target: findingNodeId,
          type: 'affected_by',
          weight: finding.severity === 'critical' ? 10 : 
                  finding.severity === 'high' ? 7 :
                  finding.severity === 'medium' ? 5 : 3
        });
      }
    });
  });

  // Add evidence nodes and connect to findings
  evidence.forEach(ev => {
    const evidenceNodeId = `evidence-${ev.evidenceId}`;
    if (!nodeIds.has(evidenceNodeId)) {
      nodes.push({
        id: evidenceNodeId,
        label: `${ev.evidenceType} (${ev.source})`,
        type: 'evidence',
        riskScore: Math.round(ev.confidenceScore * 100)
      });
      nodeIds.add(evidenceNodeId);
    }

    // Connect evidence to related findings
    ev.relatedFindings.forEach(findingId => {
      const findingNodeId = `finding-${findingId}`;
      if (nodeIds.has(findingNodeId)) {
        edges.push({
          source: evidenceNodeId,
          target: findingNodeId,
          type: 'supports',
          weight: Math.round(ev.confidenceScore * 10)
        });
      }
    });
  });

  return { nodes, edges };
}


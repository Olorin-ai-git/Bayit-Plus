/**
 * Progress Simulation Hook
 * Feature: 004-new-olorin-frontend
 *
 * Simulates progress updates for development/demo purposes.
 * In production, this should be replaced with real polling data.
 */

import { useEffect } from 'react';
import { InvestigationStatus as Status } from '@shared/types/wizard.types';
import type { Investigation, WizardSettings } from '@shared/types/wizard.types';
import type { RadarAnomaly } from '@shared/types/radar.types';
import { AgentName } from '@shared/types/agent.types';
import type { EntityRelationship, RelationshipType } from '@shared/types/relationshipTypes';
import type { AgentType } from '@shared/types/AgentRiskGauges';
import {
  calculateAgentRingRadius,
  calculateAnomalyPosition,
  calculateToolAngle,
  riskLevelToColor
} from '@shared/utils/radarGeometry';
import { DEFAULT_RISK_CONFIG } from '@shared/types/AgentRiskGauges';

interface SimulationCallbacks {
  updatePhaseProgress: (phaseId: string, progress: number) => void;
  updateToolStatus: (toolId: string, status: 'pending' | 'running' | 'completed' | 'failed') => void;
  addAnomaly: (anomaly: RadarAnomaly) => void;
  addRelationship: (relationship: EntityRelationship) => void;
  updateAgentMetrics: (agentType: AgentType, updates: any) => void;
}

/**
 * Hook to simulate progress updates (for development only)
 */
export function useProgressSimulation(
  investigation: Investigation | null,
  settings: WizardSettings | null,
  callbacks: SimulationCallbacks,
  relationships: EntityRelationship[]
) {
  const { updatePhaseProgress, addAnomaly, addRelationship, updateAgentMetrics } = callbacks;

  // Phase progress is handled by real API polling in useProgressData
  // This hook only handles anomaly detection and relationship tracking
  useEffect(() => {
    if (!investigation || investigation.status !== Status.RUNNING) return;
    // Real phase updates come from API polling, not simulation
  }, [investigation]);

  // Simulate anomaly detection
  useEffect(() => {
    if (!investigation || investigation.status !== Status.RUNNING) return;

    const interval = setInterval(() => {
      // Randomly generate anomalies
      if (Math.random() > 0.7) {
        const agentIndex = Math.floor(Math.random() * 5);
        const agentNames: AgentName[] = [
          AgentName.DEVICE_ANALYSIS,
          AgentName.LOCATION_ANALYSIS,
          AgentName.NETWORK_ANALYSIS,
          AgentName.BEHAVIOR_ANALYSIS,
          AgentName.LOGS_ANALYSIS
        ];
        const agentName = agentNames[agentIndex];
        const toolIndex = Math.floor(Math.random() * 3);
        const riskLevel = Math.floor(Math.random() * 100);

        const severity =
          riskLevel > 80 ? 'critical' :
          riskLevel > 60 ? 'high' :
          riskLevel > 40 ? 'medium' :
          'low';
        const anomalyTypes = [
          'Suspicious Login Pattern',
          'Device Mismatch',
          'Unusual Location',
          'Network Anomaly',
          'Behavioral Red Flag'
        ];

        const newAnomaly: RadarAnomaly = {
          id: `anomaly-${Date.now()}-${Math.random()}`,
          type: anomalyTypes[Math.floor(Math.random() * anomalyTypes.length)],
          riskLevel,
          severity,
          detected: Date.now(),
          detectedBy: {
            agent: agentName,
            tool: `Tool ${toolIndex + 1}`,
            agentIndex,
            toolIndex
          },
          position: calculateAnomalyPosition(
            calculateToolAngle(toolIndex, 3),
            calculateAgentRingRadius(agentIndex),
            Math.floor(Math.random() * 3)
          ),
          color: riskLevelToColor(riskLevel)
        };

        addAnomaly(newAnomaly);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [investigation, addAnomaly]);

  // Simulate relationship discovery
  useEffect(() => {
    if (!investigation || investigation.status !== Status.RUNNING || !settings) return;
    if (settings.entities.length < 2) return;

    const interval = setInterval(() => {
      // Randomly discover relationships
      if (Math.random() > 0.6 && relationships.length < settings.entities.length * 2) {
        const entityIds = settings.entities.map((e) => e.id);
        const sourceEntityId = entityIds[Math.floor(Math.random() * entityIds.length)];
        let targetEntityId = entityIds[Math.floor(Math.random() * entityIds.length)];

        while (targetEntityId === sourceEntityId && entityIds.length > 1) {
          targetEntityId = entityIds[Math.floor(Math.random() * entityIds.length)];
        }

        const relationshipTypes: RelationshipType[] = [
          'same_device',
          'same_location',
          'same_ip',
          'temporal_correlation',
          'behavior_similarity',
          'transaction_link',
          'network_connection'
        ];

        const relationshipType = relationshipTypes[Math.floor(Math.random() * relationshipTypes.length)];
        const strength = Math.random() * 0.5 + 0.5;
        const bidirectional = Math.random() > 0.5;

        const newRelationship: EntityRelationship = {
          id: `rel-${Date.now()}-${Math.random()}`,
          sourceEntityId,
          targetEntityId,
          relationshipType,
          strength,
          discoveredAt: new Date(),
          evidence: [],
          bidirectional
        };

        addRelationship(newRelationship);
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [investigation, settings, relationships, addRelationship]);

  // Simulate agent gauge updates
  useEffect(() => {
    if (!investigation || investigation.status !== Status.RUNNING) return;

    const interval = setInterval(() => {
      // This simulation logic would be replaced with real data
    }, 2000);

    return () => clearInterval(interval);
  }, [investigation, updateAgentMetrics]);
}

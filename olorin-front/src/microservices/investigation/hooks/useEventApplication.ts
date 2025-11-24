/**
 * Event Application Hook
 * Feature: Phase 3 - User Story 1 (T019 Enhancement)
 *
 * Applies investigation events to UI state (phases, tools, logs).
 * Separates event handling logic from ProgressPage component.
 *
 * SYSTEM MANDATE Compliance:
 * - No hardcoded values
 * - Type-safe event handling
 * - Comprehensive event type coverage
 */

import { useEffect, useRef } from 'react';
import { InvestigationEvent } from '../types/events';

/**
 * Event application callbacks interface
 */
export interface EventApplicationCallbacks {
  updatePhaseProgress: (phaseId: string, progress: number) => void;
  updateToolStatus: (toolId: string, status: 'pending' | 'running' | 'completed' | 'failed') => void;
  addLog: (log: any) => void;
  updateDomainFindings?: (domain: string, findings: any) => void;
}

/**
 * Custom hook for applying investigation events to UI state
 *
 * @param events - Array of investigation events to apply
 * @param callbacks - Callback functions for updating UI state
 */
export function useEventApplication(
  events: InvestigationEvent[],
  callbacks: EventApplicationCallbacks
): void {
  // Store callbacks in a ref to prevent infinite loops
  // The ref is updated on every render but doesn't trigger the effect
  const callbacksRef = useRef(callbacks);

  useEffect(() => {
    callbacksRef.current = callbacks;
  }, [callbacks]);

  useEffect(() => {
    if (!events || events.length === 0) return;

    console.log(`📊 [useEventApplication] Processing ${events.length} events`);

    const { updatePhaseProgress, updateToolStatus, addLog, updateDomainFindings } = callbacksRef.current;

    events.forEach((event: InvestigationEvent) => {
      const payload = event.payload as any; // Type assertion for payload access

      console.log(`📊 [useEventApplication] Processing event: ${event.op}`, { event, payload });

      switch (event.op) {
        case 'PHASE_CHANGE':
          if (payload.phaseId && typeof payload.progress === 'number') {
            updatePhaseProgress(payload.phaseId, payload.progress);
          }
          break;

        case 'PROGRESS':
          // Handle overall progress updates (progress_percentage, current_phase)
          if (payload.current_phase && typeof payload.progress_percentage === 'number') {
            console.log(`📊 [useEventApplication] Updating phase progress: ${payload.current_phase} -> ${payload.progress_percentage}%`);
            updatePhaseProgress(payload.current_phase, payload.progress_percentage);
          }
          // Also handle tool-specific progress if present
          if (payload.toolId && payload.status) {
            console.log(`📊 [useEventApplication] Updating tool status: ${payload.toolId} -> ${payload.status}`);
            updateToolStatus(payload.toolId, payload.status);
          }
          break;

        case 'TOOL_EXECUTION':
          // Handle tool execution events (started, completed, failed)
          if (payload.tool_name && payload.status) {
            updateToolStatus(payload.tool_name, payload.status);
          } else if (payload.toolName && payload.status) {
            updateToolStatus(payload.toolName, payload.status);
          }
          break;

        case 'DOMAIN_FINDINGS':
          // Apply domain findings to state in real-time
          console.log('🎯 [useEventApplication] Received DOMAIN_FINDINGS event:', {
            hasDomain: !!payload.domain,
            domain: payload.domain,
            hasRiskScore: payload.riskScore !== undefined || payload.risk_score !== undefined,
            riskScore: payload.riskScore,
            risk_score: payload.risk_score,
            confidence: payload.confidence,
            evidenceCount: payload.evidenceCount,
            evidence_count: payload.evidence_count,
            fullPayload: payload,
            hasUpdateCallback: !!updateDomainFindings
          });

          if (updateDomainFindings && payload.domain) {
            console.log('🎯 [useEventApplication] Calling updateDomainFindings with:', {
              domain: payload.domain,
              payload: payload
            });
            updateDomainFindings(payload.domain, payload);
          } else {
            console.warn('⚠️ [useEventApplication] Skipping DOMAIN_FINDINGS update:', {
              hasCallback: !!updateDomainFindings,
              hasDomain: !!payload.domain
            });
          }
          break;

        case 'STATE_CHANGE':
        case 'CREATED':
        case 'UPDATED':
        case 'DELETED':
        case 'SETTINGS_CHANGE':
        case 'COMPLETED':
          // Other events handled by snapshot or other hooks
          break;
      }
    });
  }, [events]); // Only depend on events, not callbacks
}

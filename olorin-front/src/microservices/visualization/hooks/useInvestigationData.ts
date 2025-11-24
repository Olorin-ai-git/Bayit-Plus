/**
 * useInvestigationData Hook
 * Feature: 002-visualization-microservice
 *
 * Custom hook for fetching and managing investigation data from backend API.
 * Integrates with WebSocket for real-time updates.
 *
 * @module visualization/hooks/useInvestigationData
 */

import { useState, useEffect, useCallback } from 'react';
import type { NetworkNode, NetworkEdge } from '../types/network.types';
import type { Event } from '../types/events.types';

// Environment configuration
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8090';
const REQUEST_TIMEOUT_MS = parseInt(process.env.REACT_APP_REQUEST_TIMEOUT_MS || '30000', 10);

interface Investigation {
  id: string;
  name: string;
  status: string;
  createdAt: string;
}

interface RiskData {
  score: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  factors?: Record<string, number>;
  history?: Array<{ timestamp: string; score: number }>;
}

interface NetworkData {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
}

interface UseInvestigationDataReturn {
  investigation: Investigation | null;
  riskData: RiskData | null;
  networkData: NetworkData | null;
  timelineEvents: Event[] | null;
  loading: boolean;
  error: string | null;
  refreshData: () => void;
}

export function useInvestigationData(investigationId?: string): UseInvestigationDataReturn {
  const [investigation, setInvestigation] = useState<Investigation | null>(null);
  const [riskData, setRiskData] = useState<RiskData | null>(null);
  const [networkData, setNetworkData] = useState<NetworkData | null>(null);
  const [timelineEvents, setTimelineEvents] = useState<Event[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch investigation data from API
  const fetchInvestigationData = useCallback(async () => {
    // Don't fetch if investigationId is missing or is a reserved route name
    const reservedNames = ['visualization', 'charts', 'maps', 'risk-analysis', 'reports', 'analytics', 'rag', 'investigations', 'investigations-management', 'compare'];
    if (!investigationId || reservedNames.includes(investigationId.toLowerCase())) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

      // Fetch investigation state (contains investigation details and risk data)
      const stateResponse = await fetch(`${API_BASE_URL}/api/v1/investigation-state/${investigationId}`, {
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json' }
      });

      clearTimeout(timeoutId);

      if (!stateResponse.ok && stateResponse.status !== 304) {
        // If investigation-state doesn't exist, try the old investigation endpoint
        const invResponse = await fetch(`${API_BASE_URL}/api/v1/investigations/${investigationId}`, {
          signal: controller.signal,
          headers: { 'Content-Type': 'application/json' }
        });

        if (!invResponse.ok) {
          throw new Error(`Failed to fetch investigation: ${invResponse.statusText}`);
        }

        const invData = await invResponse.json();
        setInvestigation(invData);
      } else if (stateResponse.ok) {
        // Parse investigation state response
        const stateData = await stateResponse.json();
        
        // Extract investigation details
        setInvestigation({
          id: stateData.investigation_id,
          name: `Investigation ${stateData.investigation_id}`,
          status: stateData.status,
          createdAt: stateData.created_at || new Date().toISOString()
        });

        // Extract risk data from results
        if (stateData.results?.risk_score !== undefined) {
          const riskScore = stateData.results.risk_score;
          setRiskData({
            score: riskScore,
            severity: riskScore >= 75 ? 'critical' : riskScore >= 50 ? 'high' : riskScore >= 25 ? 'medium' : 'low',
            factors: stateData.results.domain_findings || {},
            history: stateData.progress?.risk_score_history || []
          });
        }

        // Fetch network data if we have entity_id
        if (stateData.entity_id) {
          try {
            const networkResponse = await fetch(
              `${API_BASE_URL}/network/${stateData.entity_id}?investigation_id=${investigationId}&entity_type=${stateData.entity_type || 'user_id'}`,
              {
                headers: { 'Content-Type': 'application/json' }
              }
            );

            if (networkResponse.ok) {
              const networkJson = await networkResponse.json();
              // Transform network response to match expected format
              // The network endpoint returns a different structure, so we need to adapt it
              if (networkJson.nodes && networkJson.edges) {
                setNetworkData({ nodes: networkJson.nodes, edges: networkJson.edges });
              } else if (networkJson.entities) {
                // Transform entities format to nodes/edges if needed
                const nodes = Object.entries(networkJson.entities || {}).map(([id, data]: [string, any]) => ({
                  id,
                  type: data.type || 'entity',
                  label: data.label || id,
                  metadata: data
                }));
                setNetworkData({ nodes, edges: [] });
              }
            }
          } catch (networkErr) {
            console.warn('[useInvestigationData] Failed to fetch network data:', networkErr);
            // Don't fail the whole request if network data fails
          }
        }
      }

      // Fetch timeline events
      try {
        const eventsResponse = await fetch(`${API_BASE_URL}/api/v1/investigations/${investigationId}/events?limit=100`, {
          headers: { 'Content-Type': 'application/json' }
        });

        if (eventsResponse.ok) {
          const eventsData = await eventsResponse.json();
          // Handle both direct array and wrapped response formats
          const eventsArray = Array.isArray(eventsData) ? eventsData : (eventsData.data || eventsData.events || []);
          setTimelineEvents(eventsArray);
        }
      } catch (eventsErr) {
        console.warn('[useInvestigationData] Failed to fetch events:', eventsErr);
        // Don't fail the whole request if events fail
      }

      setLoading(false);
    } catch (err) {
      console.error('[useInvestigationData] Fetch error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load investigation data');
      setLoading(false);
    }
  }, [investigationId]);

  // WebSocket event listeners for real-time updates using unified event bus
  useEffect(() => {
    if (!investigationId) {
      return;
    }

    let timeoutId: NodeJS.Timeout | null = null;
    let cleanup: (() => void) | null = null;

    const setupEventListeners = () => {
      // Check if event bus is available and has the required methods
      if (!window.olorin?.eventBus || typeof window.olorin.eventBus.on !== 'function') {
        // Event bus not ready yet, try again after a short delay (max 10 attempts = 1 second)
        let attempts = 0;
        const maxAttempts = 10;
        
        const retry = () => {
          attempts++;
          if (attempts < maxAttempts && (!window.olorin?.eventBus || typeof window.olorin.eventBus.on !== 'function')) {
            timeoutId = setTimeout(retry, 100);
          } else if (window.olorin?.eventBus && typeof window.olorin.eventBus.on === 'function') {
            // Event bus is now ready, set up listeners
            const eventBus = window.olorin.eventBus;

            // Subscribe to investigation risk updates
            const riskHandler = (data: any) => {
              if (data.investigationId === investigationId && data.risk) {
                setRiskData(data.risk);
              }
            };

            // Subscribe to investigation updates (which may include risk data)
            const investigationHandler = (data: any) => {
              if (data.id === investigationId && data.risk_score !== undefined) {
                setRiskData({
                  score: data.risk_score,
                  severity: data.risk_score >= 75 ? 'critical' : data.risk_score >= 50 ? 'high' : data.risk_score >= 25 ? 'medium' : 'low',
                  factors: data.factors || {}
                });
              }
            };

            // Subscribe to evidence/event additions
            const evidenceHandler = (data: any) => {
              if (data.investigationId === investigationId && data.evidence) {
                // Convert evidence to timeline event format if needed
                const event: Event = {
                  id: data.evidence.id || `evt-${Date.now()}`,
                  timestamp: data.evidence.timestamp || new Date().toISOString(),
                  type: 'info',
                  severity: 'low',
                  message: data.evidence.description || 'Evidence added',
                  metadata: data.evidence
                };
                setTimelineEvents(prev => prev ? [...prev, event] : [event]);
              }
            };

            // Subscribe to multiple event types from unified event bus
            eventBus.on('investigation:risk:calculated', riskHandler);
            eventBus.on('investigation:updated', investigationHandler);
            eventBus.on('investigation:evidence:added', evidenceHandler);

            // Store cleanup function
            cleanup = () => {
              if (eventBus && typeof eventBus.off === 'function') {
                eventBus.off('investigation:risk:calculated', riskHandler);
                eventBus.off('investigation:updated', investigationHandler);
                eventBus.off('investigation:evidence:added', evidenceHandler);
              }
            };
          }
        };

        timeoutId = setTimeout(retry, 100);
        return;
      }

      // Event bus is ready, set up listeners immediately
      const eventBus = window.olorin.eventBus;

      // Subscribe to investigation risk updates
      const riskHandler = (data: any) => {
        if (data.investigationId === investigationId && data.risk) {
          setRiskData(data.risk);
        }
      };

      // Subscribe to investigation updates (which may include risk data)
      const investigationHandler = (data: any) => {
        if (data.id === investigationId && data.risk_score !== undefined) {
          setRiskData({
            score: data.risk_score,
            severity: data.risk_score >= 75 ? 'critical' : data.risk_score >= 50 ? 'high' : data.risk_score >= 25 ? 'medium' : 'low',
            factors: data.factors || {}
          });
        }
      };

      // Subscribe to evidence/event additions
      const evidenceHandler = (data: any) => {
        if (data.investigationId === investigationId && data.evidence) {
          // Convert evidence to timeline event format if needed
          const event: Event = {
            id: data.evidence.id || `evt-${Date.now()}`,
            timestamp: data.evidence.timestamp || new Date().toISOString(),
            type: 'info',
            severity: 'low',
            message: data.evidence.description || 'Evidence added',
            metadata: data.evidence
          };
          setTimelineEvents(prev => prev ? [...prev, event] : [event]);
        }
      };

      // Subscribe to multiple event types from unified event bus
      eventBus.on('investigation:risk:calculated', riskHandler);
      eventBus.on('investigation:updated', investigationHandler);
      eventBus.on('investigation:evidence:added', evidenceHandler);

      // Store cleanup function
      cleanup = () => {
        if (eventBus && typeof eventBus.off === 'function') {
          eventBus.off('investigation:risk:calculated', riskHandler);
          eventBus.off('investigation:updated', investigationHandler);
          eventBus.off('investigation:evidence:added', evidenceHandler);
        }
      };
    };

    setupEventListeners();

    // Cleanup function
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      if (cleanup) {
        cleanup();
      }
    };
  }, [investigationId]);

  // Initial data fetch
  useEffect(() => {
    fetchInvestigationData();
  }, [fetchInvestigationData]);

  return {
    investigation,
    riskData,
    networkData,
    timelineEvents,
    loading,
    error,
    refreshData: fetchInvestigationData
  };
}

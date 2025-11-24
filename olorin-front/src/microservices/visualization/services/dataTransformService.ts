/**
 * Data Transformation Service
 *
 * Transforms API responses to visualization-ready formats.
 * Supports network graphs, timelines, risk scores, and map markers.
 *
 * NO HARDCODED VALUES - All transformations are type-safe and configuration-driven.
 */

import {
  NetworkGraphData,
  TimelineEvent,
  RiskScore,
  MapMarker,
  validateNetworkGraphResponse,
  validateTimelineResponse,
  validateRiskScoreResponse,
  validateMapMarkersResponse,
  calculateRiskLevel
} from './dataTransformService.validators';

/**
 * Data Transformation Service
 * Singleton service for normalizing API responses
 */
export class DataTransformService {
  private static instance: DataTransformService;

  private constructor() {}

  public static getInstance(): DataTransformService {
    if (!DataTransformService.instance) {
      DataTransformService.instance = new DataTransformService();
    }
    return DataTransformService.instance;
  }

  /**
   * Transform API response to network graph data
   */
  public transformToNetworkGraph(apiResponse: unknown): NetworkGraphData {
    try {
      const validated = validateNetworkGraphResponse(apiResponse);
      return {
        nodes: validated.nodes.map((node) => ({
          id: node.id,
          type: node.type,
          label: node.label || node.id,
          metadata: node.metadata || {}
        })),
        edges: validated.edges.map((edge) => ({
          id: edge.id || `${edge.source}-${edge.target}`,
          source: edge.source,
          target: edge.target,
          type: edge.type || 'connected',
          weight: edge.weight
        }))
      };
    } catch (error) {
      console.error('[DataTransformService] Network graph transformation error:', error);
      throw new Error('Failed to transform network graph data');
    }
  }

  /**
   * Transform API response to timeline events
   */
  public transformToTimeline(apiResponse: unknown): TimelineEvent[] {
    try {
      const validated = validateTimelineResponse(apiResponse);
      return validated.events.map((event) => ({
        id: event.id || `event-${Date.now()}-${Math.random()}`,
        timestamp: event.timestamp || new Date().toISOString(),
        type: event.type || 'info',
        severity: event.severity || 'low',
        message: event.message,
        metadata: event.metadata || {}
      }));
    } catch (error) {
      console.error('[DataTransformService] Timeline transformation error:', error);
      throw new Error('Failed to transform timeline data');
    }
  }

  /**
   * Transform API response to risk score
   */
  public transformToRiskScore(apiResponse: unknown): RiskScore {
    try {
      const validated = validateRiskScoreResponse(apiResponse);
      const score = Math.max(0, Math.min(100, validated.score));

      return {
        score,
        level: calculateRiskLevel(score),
        factors: validated.factors.map((factor) => ({
          name: factor.name,
          impact: Math.max(0, Math.min(100, factor.impact)),
          description: factor.description
        }))
      };
    } catch (error) {
      console.error('[DataTransformService] Risk score transformation error:', error);
      throw new Error('Failed to transform risk score data');
    }
  }

  /**
   * Transform API response to map markers
   */
  public transformToMapMarkers(apiResponse: unknown): MapMarker[] {
    try {
      const validated = validateMapMarkersResponse(apiResponse);
      return validated.markers.map((marker) => ({
        id: marker.id || `marker-${Date.now()}-${Math.random()}`,
        type: marker.type || 'risk',
        latitude: marker.latitude,
        longitude: marker.longitude,
        label: marker.label || marker.id || 'Unknown',
        metadata: marker.metadata || {}
      }));
    } catch (error) {
      console.error('[DataTransformService] Map markers transformation error:', error);
      throw new Error('Failed to transform map markers data');
    }
  }
}

export const dataTransformService = DataTransformService.getInstance();
export default dataTransformService;

export * from './dataTransformService.validators';

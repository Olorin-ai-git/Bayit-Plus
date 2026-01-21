/**
 * Anomaly Detection API Service
 * NO HARDCODED VALUES - All configuration from environment variables.
 */

import { BaseApiService } from '../../../shared/services/BaseApiService';
import type {
  AnomalyEvent,
  AnomalyFilter,
  AnomalyListResponse,
  DetectRequest,
  DetectResponse,
  SeriesRequest,
  SeriesResponse,
  ReplayRequest,
  ReplayResponse,
  PreviewRequest,
  PreviewResponse,
  InvestigateRequest,
  InvestigateResponse,
  Detector,
  DetectionRun,
} from '../types/anomaly';

const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL || 'http://localhost:8090';

export class AnomalyApiService extends BaseApiService {
  constructor() {
    super(`${API_BASE_URL}/api/v1/analytics`);
  }

  // Anomaly endpoints
  async listAnomalies(filter?: AnomalyFilter): Promise<AnomalyListResponse> {
    const queryString = filter ? this.buildQueryString(filter) : '';
    return this.get<AnomalyListResponse>(
      `/anomalies${queryString ? `?${queryString}` : ''}`
    );
  }

  async streamAnomalies(
    callback: (anomaly: AnomalyEvent) => void,
    filters?: AnomalyFilter
  ): Promise<() => void> {
    const wsUrl = this.baseUrl.replace('http', 'ws') + '/stream/anomalies';
    const queryString = filters ? this.buildQueryString(filters) : '';
    let ws: WebSocket | null = null;
    let lastTimestamp: string | null = null;
    let isClosing = false;

    // Add last timestamp to query string for resume
    const resumeQuery = lastTimestamp ? `&since=${lastTimestamp}` : '';
    const fullQuery = queryString 
      ? `${queryString}${resumeQuery}` 
      : resumeQuery 
        ? resumeQuery.substring(1) // Remove leading &
        : '';

    try {
      ws = new WebSocket(`${wsUrl}${fullQuery ? `?${fullQuery}` : ''}`);
    } catch (error) {
      console.error('Failed to create WebSocket:', error);
      throw error; // Let the hook handle reconnection
    }

    ws.onopen = () => {
      // WebSocket connected - silent in production
      if (process.env.NODE_ENV === 'development') {
        console.debug('[WebSocket] Connected for anomaly streaming');
      }
    };

    ws.onmessage = (event) => {
      try {
        const anomaly = JSON.parse(event.data) as AnomalyEvent;
        // Update last timestamp for resume
        if (anomaly.created_at) {
          lastTimestamp = anomaly.created_at;
        }
        callback(anomaly);
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      // Error will trigger onclose
    };

    ws.onclose = (event) => {
      // WebSocket closed - only log in development
      if (process.env.NODE_ENV === 'development') {
        console.debug(`[WebSocket] Closed: code=${event.code}, reason=${event.reason || 'none'}`);
      }
      // Don't auto-reconnect here - let the hook handle reconnection
      // This prevents infinite loops and resource exhaustion
    };

    // Return cleanup function
    return () => {
      isClosing = true;
      if (ws) {
        try {
          ws.close();
        } catch (e) {
          // Ignore errors during cleanup
        }
        ws = null;
      }
    };
  }

  async getAnomaly(id: string): Promise<AnomalyEvent> {
    return this.get<AnomalyEvent>(`/anomalies/${id}`);
  }

  async detectAnomalies(request: DetectRequest): Promise<DetectResponse> {
    return this.post<DetectResponse>('/anomalies/detect', request);
  }

  async investigateAnomaly(
    anomalyId: string
  ): Promise<InvestigateResponse> {
    return this.post<InvestigateResponse>(
      `/anomalies/${anomalyId}/investigate`,
      {}
    );
  }

  // Series endpoint
  async getSeries(request: SeriesRequest): Promise<SeriesResponse> {
    return this.post<SeriesResponse>('/series', request);
  }

  // Detector endpoints
  async listDetectors(): Promise<Detector[]> {
    return this.get<Detector[]>('/detectors');
  }

  async getDetector(id: string): Promise<Detector> {
    return this.get<Detector>(`/detectors/${id}`);
  }

  async createDetector(detector: Omit<Detector, 'id' | 'created_at' | 'updated_at'>): Promise<Detector> {
    return this.post<Detector>('/detectors', detector);
  }

  async updateDetector(
    id: string,
    detector: Partial<Omit<Detector, 'id' | 'created_at' | 'updated_at'>>
  ): Promise<Detector> {
    return this.put<Detector>(`/detectors/${id}`, detector);
  }

  async deleteDetector(id: string): Promise<void> {
    return this.delete(`/detectors/${id}`);
  }

  async bulkDeleteDetectors(ids: string[]): Promise<{ deleted_count: number; not_found_ids: string[]; message: string }> {
    return this.post<{ deleted_count: number; not_found_ids: string[]; message: string }>(
      '/detectors/bulk-delete',
      { detector_ids: ids }
    );
  }

  async previewDetector(request: PreviewRequest): Promise<PreviewResponse> {
    return this.post<PreviewResponse>(
      `/detectors/${request.detector_id}/preview`,
      {
        window_from: request.window_from,
        window_to: request.window_to,
      }
    );
  }

  async promoteDetector(id: string): Promise<Detector> {
    return this.post<Detector>(`/detectors/${id}/promote`, {});
  }

  // Replay endpoint
  async replayDetection(request: ReplayRequest): Promise<ReplayResponse> {
    return this.post<ReplayResponse>('/replay', request);
  }

  // Investigation endpoint
  async investigateAnomaly(anomalyId: string): Promise<InvestigateResponse> {
    return this.post<InvestigateResponse>(`/anomalies/${anomalyId}/investigate`, {});
  }

  // Sample cohort values endpoint
  async getSampleCohortValues(
    dimension: string,
    limit: number = 10
  ): Promise<{ dimension: string; values: string[]; count: number }> {
    return this.get<{ dimension: string; values: string[]; count: number }>(
      `/cohorts/sample?dimension=${encodeURIComponent(dimension)}&limit=${limit}`
    );
  }
}


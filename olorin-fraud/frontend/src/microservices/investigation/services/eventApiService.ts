/**
 * Event API Service
 * Feature: 008-live-investigation-updates (US2)
 *
 * Handles API calls for event pagination and audit trail.
 * Integrates with /api/v1/investigations/{id}/events endpoint.
 */

import { BaseApiService } from '../../../shared/services/BaseApiService';
import { getRuntimeConfig } from '../../../shared/config/runtimeConfig';
import {
  EventsFeedResponse,
  InvestigationEvent,
  EventFilterParams,
  AuditTrailSummary
} from '../types/events';

export class EventApiService extends BaseApiService {
  private baseEndpoint = '/api/v1/investigations';

  constructor(baseUrl?: string) {
    // SYSTEM MANDATE Compliance: Use runtime config with fallback for development
    // If baseUrl is provided (for testing), use it. Otherwise, get from config with fallback.
    const apiUrl = baseUrl || getRuntimeConfig('REACT_APP_API_BASE_URL', { 
      fallback: 'http://localhost:8090',
      required: false 
    });
    super(apiUrl);
  }

  /**
   * Fetch events with cursor-based pagination
   *
   * @param investigationId - Investigation ID
   * @param cursor - Pagination cursor (optional)
   * @param limit - Max events to return
   * @param filters - Event filtering criteria (optional)
   * @returns Events response with pagination info
   */
  async fetchEvents(
    investigationId: string,
    cursor?: string,
    limit: number = 100,
    filters?: EventFilterParams
  ): Promise<EventsFeedResponse> {
    try {
      const params = new URLSearchParams();
      
      if (cursor) {
        params.append('since', cursor);
      }
      
      params.append('limit', String(limit));
      
      if (filters) {
        if (filters.action_types?.length) {
          filters.action_types.forEach(type => {
            params.append('action_types', type);
          });
        }
        
        if (filters.sources?.length) {
          filters.sources.forEach(source => {
            params.append('sources', source);
          });
        }
        
        if (filters.user_ids?.length) {
          filters.user_ids.forEach(userId => {
            params.append('user_ids', userId);
          });
        }
        
        if (filters.since_timestamp) {
          params.append('since_timestamp', String(filters.since_timestamp));
        }
        
        if (filters.until_timestamp) {
          params.append('until_timestamp', String(filters.until_timestamp));
        }
      }
      
      const queryString = params.toString();
      const url = `${this.baseEndpoint}/${investigationId}/events${queryString ? '?' + queryString : ''}`;
      
      const response = await this.get<EventsFeedResponse>(url);
      return response;
    } catch (error) {
      console.error(`Failed to fetch events for ${investigationId}:`, error);
      throw error;
    }
  }

  /**
   * Fetch events with ETag caching
   *
   * Supports If-None-Match header for 304 Not Modified responses
   * to reduce bandwidth usage
   *
   * @param investigationId - Investigation ID
   * @param etag - Current ETag (optional)
   * @param cursor - Pagination cursor (optional)
   * @param limit - Max events
   * @returns Events response or null if not modified (304)
   */
  async fetchEventsWithETag(
    investigationId: string,
    etag?: string,
    cursor?: string,
    limit: number = 100
  ): Promise<EventsFeedResponse | null> {
    try {
      const params = new URLSearchParams();
      
      if (cursor) {
        params.append('since', cursor);
      }
      
      params.append('limit', String(limit));
      
      const queryString = params.toString();
      const url = `${this.baseEndpoint}/${investigationId}/events${queryString ? '?' + queryString : ''}`;
      
      const headers: Record<string, string> = {};
      if (etag) {
        headers['If-None-Match'] = etag;
      }
      
      try {
        const response = await this.get<EventsFeedResponse>(url, headers);
        return response;
      } catch (error: any) {
        // Handle 304 Not Modified
        if (error.status === 304) {
          console.debug(`Events not modified for ${investigationId}`);
          return null;
        }
        throw error;
      }
    } catch (error) {
      console.error(`Failed to fetch events with ETag for ${investigationId}:`, error);
      throw error;
    }
  }

  /**
   * Get audit trail summary
   *
   * Returns statistics about all events:
   * - Total count
   * - Distribution by action type
   * - Distribution by source
   * - Time range
   *
   * @param investigationId - Investigation ID
   * @returns Audit trail summary
   */
  async getAuditTrailSummary(investigationId: string): Promise<AuditTrailSummary> {
    try {
      const url = `${this.baseEndpoint}/${investigationId}/events/summary`;
      const response = await this.get<AuditTrailSummary>(url);
      return response;
    } catch (error) {
      console.error(`Failed to get audit trail summary for ${investigationId}:`, error);
      throw error;
    }
  }

  /**
   * Get complete audit trail (all events)
   *
   * @param investigationId - Investigation ID
   * @param filters - Optional filtering criteria
   * @returns Complete audit trail
   */
  async getCompleteAuditTrail(
    investigationId: string,
    filters?: EventFilterParams
  ): Promise<InvestigationEvent[]> {
    try {
      let allEvents: InvestigationEvent[] = [];
      let cursor: string | undefined;
      let hasMore = true;
      
      // Paginate through all events
      while (hasMore) {
        const response = await this.fetchEvents(
          investigationId,
          cursor,
          1000, // Max limit
          filters
        );
        
        allEvents = allEvents.concat(response.items);
        
        if (response.has_more && response.next_cursor) {
          cursor = response.next_cursor;
        } else {
          hasMore = false;
        }
      }
      
      return allEvents;
    } catch (error) {
      console.error(`Failed to get complete audit trail for ${investigationId}:`, error);
      throw error;
    }
  }
}

// Export singleton instance
export const eventApiService = new EventApiService();


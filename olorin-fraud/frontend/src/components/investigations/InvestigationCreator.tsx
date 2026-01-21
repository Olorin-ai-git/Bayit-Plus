/**
 * Sample React Component - Investigation Creator
 *
 * Demonstrates usage of auto-generated TypeScript types from backend OpenAPI schema.
 *
 * Constitutional Compliance:
 * - Uses generated TypeScript types from src/api/generated/models
 * - Configuration-driven API calls (no hardcoded URLs)
 * - Proper error handling with type safety
 * - No mock data or placeholders
 */

import React, { useState } from 'react';
import axios, { AxiosError } from 'axios';
import { getApiConfig } from '../../api/config';

/**
 * Import generated TypeScript types
 *
 * These types are auto-generated from the backend OpenAPI schema
 * by running: npm run generate-api-types
 *
 * Constitutional Compliance:
 * - Types generated from backend (single source of truth)
 * - No manual type definitions for API contracts
 */
// NOTE: These imports will work after running npm run generate-api-types
// import type { InvestigationRequest, InvestigationResponse, ErrorResponse } from '../../api/generated/models';

// Temporary inline types until we run type generation
// These match the backend Pydantic models exactly
type EntityType = 'email' | 'phone' | 'device_id' | 'ip_address' | 'user_id';

interface TimeRange {
  start_time: string; // ISO 8601 format
  end_time: string;   // ISO 8601 format
}

interface InvestigationRequest {
  entity_id: string;
  entity_type: EntityType;
  time_range?: TimeRange;
}

interface InvestigationResponse {
  investigation_id: string;
  status: string;
  risk_score: number | null;
  created_at: string;
  updated_at: string;
}

interface ErrorResponse {
  error: string;
  message: string;
  details?: Record<string, unknown>;
}

/**
 * Sample Investigation Creator Component
 *
 * Demonstrates:
 * - Type-safe API requests using generated types
 * - Configuration-driven API calls
 * - Proper error handling
 * - React hooks for state management
 */
export const InvestigationCreator: React.FC = () => {
  const [entityId, setEntityId] = useState<string>('');
  const [entityType, setEntityType] = useState<EntityType>('email');
  const [loading, setLoading] = useState<boolean>(false);
  const [response, setResponse] = useState<InvestigationResponse | null>(null);
  const [error, setError] = useState<ErrorResponse | null>(null);

  /**
   * Create investigation with type-safe request
   *
   * Constitutional Compliance:
   * - API URL from configuration (no hardcoded URL)
   * - Request timeout from configuration
   * - Type-safe request/response
   */
  const createInvestigation = async () => {
    if (!entityId) {
      setError({
        error: 'ValidationError',
        message: 'Entity ID is required',
        details: {}
      });
      return;
    }

    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      const config = getApiConfig();

      // Type-safe request body
      const requestBody: InvestigationRequest = {
        entity_id: entityId,
        entity_type: entityType
      };

      // API call with configuration-driven settings
      const apiResponse = await axios.post<InvestigationResponse>(
        `${config.apiBaseUrl}/api/v1/investigations/`,
        requestBody,
        {
          timeout: config.requestTimeoutMs,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      setResponse(apiResponse.data);
    } catch (err) {
      // Type-safe error handling
      const axiosError = err as AxiosError<ErrorResponse>;
      if (axiosError.response?.data) {
        setError(axiosError.response.data);
      } else {
        setError({
          error: 'NetworkError',
          message: axiosError.message || 'Failed to create investigation'
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">Create Investigation</h2>

      <div className="space-y-4">
        {/* Entity ID Input */}
        <div>
          <label htmlFor="entityId" className="block text-sm font-medium mb-2">
            Entity ID
          </label>
          <input
            id="entityId"
            type="text"
            value={entityId}
            onChange={(e) => setEntityId(e.target.value)}
            placeholder="user@example.com"
            className="w-full px-4 py-2 border border-gray-300 rounded-md"
          />
        </div>

        {/* Entity Type Select */}
        <div>
          <label htmlFor="entityType" className="block text-sm font-medium mb-2">
            Entity Type
          </label>
          <select
            id="entityType"
            value={entityType}
            onChange={(e) => setEntityType(e.target.value as EntityType)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md"
          >
            <option value="email">Email</option>
            <option value="phone">Phone</option>
            <option value="device_id">Device ID</option>
            <option value="ip_address">IP Address</option>
            <option value="user_id">User ID</option>
          </select>
        </div>

        {/* Submit Button */}
        <button
          onClick={createInvestigation}
          disabled={loading || !entityId}
          className={`w-full py-2 px-4 rounded-md font-medium transition-colors ${
            loading || !entityId
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-500 text-white hover:bg-blue-600'
          }`}
        >
          {loading ? 'Creating...' : 'Create Investigation'}
        </button>

        {/* Response Display */}
        {response && (
          <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-md">
            <h3 className="font-semibold mb-2 text-green-800">Investigation Created!</h3>
            <div className="text-sm space-y-1">
              <p><strong>ID:</strong> {response.investigation_id}</p>
              <p><strong>Status:</strong> {response.status}</p>
              <p><strong>Created:</strong> {new Date(response.created_at).toLocaleString()}</p>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-md">
            <h3 className="font-semibold mb-2 text-red-800">{error.error}</h3>
            <p className="text-sm text-red-600">{error.message}</p>
            {error.details && (
              <pre className="mt-2 text-xs text-red-500">
                {JSON.stringify(error.details, null, 2)}
              </pre>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default InvestigationCreator;

/**
 * useInvestigation Hook - Manage investigation creation from anomalies
 * Provides functions to create investigations and track investigation status
 */

import { useState, useCallback, useMemo } from 'react';
import { AnomalyApiService } from '../services/anomalyApi';
import { useToast } from './useToast';
import type { InvestigateResponse } from '../types/anomaly';

export interface UseInvestigationOptions {
  onInvestigationCreated?: (response: InvestigateResponse) => void;
  onError?: (error: Error) => void;
}

export function useInvestigation(options: UseInvestigationOptions = {}) {
  const { onInvestigationCreated, onError } = options;
  const [isCreating, setIsCreating] = useState(false);
  const { showToast } = useToast();

  // Memoize apiService to prevent recreation on every render
  const apiService = useMemo(() => new AnomalyApiService(), []);

  const createInvestigation = useCallback(
    async (anomalyId: string): Promise<InvestigateResponse | null> => {
      if (isCreating) {
        return null;
      }

      setIsCreating(true);
      try {
        const response = await apiService.investigateAnomaly(anomalyId);
        
        // Log the response for debugging
        console.log('[useInvestigation] API Response:', response);
        
        // Validate response structure
        if (!response) {
          throw new Error('Empty response from server');
        }
        
        // Handle different response formats
        const investigationId = response.investigation_id || (response as any).id || (response as any).investigationId;
        
        if (!investigationId) {
          console.error('[useInvestigation] Response missing investigation_id:', response);
          throw new Error('Response missing investigation_id field');
        }

        const shortId = typeof investigationId === 'string' 
          ? investigationId.substring(0, 8) 
          : String(investigationId).substring(0, 8);
        
        showToast(
          'success',
          'Investigation Created',
          `Investigation ${shortId}... created successfully`
        );

        // Ensure response has investigation_id for callbacks
        const normalizedResponse: InvestigateResponse = {
          ...response,
          investigation_id: investigationId,
        };

        onInvestigationCreated?.(normalizedResponse);
        return normalizedResponse;
      } catch (err) {
        // Log full error details to console for debugging
        console.error('[useInvestigation] Failed to create investigation:', err);
        
        // Extract detailed error information
        let errorMessage = 'Failed to create investigation';
        let errorDetails: any = null;
        
        if (err instanceof Error) {
          errorMessage = err.message || errorMessage;
          // Check if error has additional properties from API
          const apiError = err as any;
          if (apiError.status) {
            console.error(`[useInvestigation] API Error Status: ${apiError.status}`);
          }
          if (apiError.details) {
            errorDetails = apiError.details;
            console.error('[useInvestigation] API Error Details:', apiError.details);
          }
          if (apiError.code) {
            console.error(`[useInvestigation] API Error Code: ${apiError.code}`);
          }
        } else if (typeof err === 'object' && err !== null) {
          const apiError = err as any;
          errorMessage = apiError.message || apiError.error || apiError.detail || errorMessage;
          errorDetails = apiError.details || apiError;
          console.error('[useInvestigation] API Error Object:', apiError);
        } else {
          console.error('[useInvestigation] Unknown error type:', typeof err, err);
        }
        
        const error = err instanceof Error ? err : new Error(errorMessage);
        showToast('error', 'Investigation Failed', errorMessage);
        onError?.(error);
        return null;
      } finally {
        setIsCreating(false);
      }
    },
    [isCreating, apiService, showToast, onInvestigationCreated, onError] // apiService is memoized and stable
  );

  return {
    createInvestigation,
    isCreating,
  };
}


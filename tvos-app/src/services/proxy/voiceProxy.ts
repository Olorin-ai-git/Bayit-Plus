/**
 * Voice Command Proxy Service - Backend proxy methods for voice processing
 * Extracted from backendProxyService.ts for file size compliance
 */

import { API_BASE_URL } from '../../config/appConfig';
import { useAuthStore } from '@olorin/shared-stores';
import { logger } from '../../utils/logger';
import type { VoiceCommandRequest, VoiceCommandResponse, HealthCheckResponse } from '../../types/backendProxy';

async function getHeaders(): Promise<HeadersInit> {
  const { token } = useAuthStore.getState();
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };
}

export async function processVoiceCommand(request: VoiceCommandRequest): Promise<VoiceCommandResponse> {
  try {
    const headers = await getHeaders();
    const response = await fetch(`${API_BASE_URL}/voice/command`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        transcription: request.transcription,
        confidence: request.confidence,
        language: request.language,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Voice command processing failed: ${response.status} - ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    logger.error('Voice command processing error', { module: 'backendProxyService', error });
    throw error;
  }
}

export async function getVoiceCommandSuggestions(
  partialTranscription: string,
  language: string = 'en'
): Promise<{ suggestions: string[] }> {
  try {
    const headers = await getHeaders();
    const response = await fetch(`${API_BASE_URL}/voice/suggestions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ partial: partialTranscription, language }),
    });

    if (!response.ok) {
      throw new Error(`Failed to get voice command suggestions: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    logger.error('Failed to get voice suggestions', { module: 'backendProxyService', error });
    throw error;
  }
}

export async function checkVoiceHealth(): Promise<HealthCheckResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/voice/health`, { method: 'GET' });

    if (!response.ok) {
      throw new Error(`Voice health check failed: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    logger.error('Voice health check error', { module: 'backendProxyService', error });
    throw error;
  }
}

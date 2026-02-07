/**
 * Wake Word Detection Proxy Service - Backend proxy methods
 * Extracted from backendProxyService.ts for file size compliance
 */

import { API_BASE_URL } from '../../config/appConfig';
import { useAuthStore } from '@olorin/shared-stores';
import { logger } from '../../utils/logger';
import type { WakeWordDetectResponse, WakeWordModel, HealthCheckResponse } from '../../types/backendProxy';

async function getHeaders(): Promise<HeadersInit> {
  const { token } = useAuthStore.getState();
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };
}

export async function detectWakeWord(
  audioBlob: Blob,
  languageCode: string = 'en',
  sensitivity: number = 0.5
): Promise<WakeWordDetectResponse> {
  try {
    const headers = await getHeaders();
    const formData = new FormData();
    formData.append('file', audioBlob, 'audio.wav');
    formData.append('language_code', languageCode);
    formData.append('sensitivity', sensitivity.toString());

    const response = await fetch(`${API_BASE_URL}/wake-word/detect`, {
      method: 'POST',
      headers: { 'Authorization': headers.Authorization as string },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Wake word detection failed: ${response.status} - ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    logger.error('Wake word detection error', { module: 'backendProxyService', error });
    throw error;
  }
}

export async function getAvailableWakeWordModels(): Promise<Record<string, WakeWordModel>> {
  try {
    const headers = await getHeaders();
    const response = await fetch(`${API_BASE_URL}/wake-word/models`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch wake word models: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    logger.error('Failed to get wake word models', { module: 'backendProxyService', error });
    throw error;
  }
}

export async function checkWakeWordHealth(): Promise<HealthCheckResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/wake-word/health`, { method: 'GET' });

    if (!response.ok) {
      throw new Error(`Wake word health check failed: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    logger.error('Wake word health check error', { module: 'backendProxyService', error });
    throw error;
  }
}

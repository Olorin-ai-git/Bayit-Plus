/**
 * TTS Proxy Service - Text-to-Speech backend proxy methods
 * Extracted from backendProxyService.ts for file size compliance
 */

import { API_BASE_URL } from '../../config/appConfig';
import { useAuthStore } from '@olorin/shared-stores';
import { logger } from '../../utils/logger';
import type { TTSSynthesizeRequest, TTSVoice, HealthCheckResponse } from '../../types/backendProxy';

async function getHeaders(): Promise<HeadersInit> {
  const { token } = useAuthStore.getState();
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };
}

export async function synthesizeSpeech(request: TTSSynthesizeRequest): Promise<Blob> {
  try {
    const headers = await getHeaders();
    const response = await fetch(`${API_BASE_URL}/tts/synthesize`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        text: request.text,
        voice_id: request.voice_id || 'default',
        language_code: request.language_code || 'en',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`TTS synthesis failed: ${response.status} - ${errorText}`);
    }

    return await response.blob();
  } catch (error) {
    logger.error('TTS synthesis error', { module: 'backendProxyService', error });
    throw error;
  }
}

export async function getAvailableTTSVoices(): Promise<Record<string, TTSVoice>> {
  try {
    const headers = await getHeaders();
    const response = await fetch(`${API_BASE_URL}/tts/voices`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch TTS voices: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    logger.error('Failed to get TTS voices', { module: 'backendProxyService', error });
    throw error;
  }
}

export async function checkTTSHealth(): Promise<HealthCheckResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/tts/health`, { method: 'GET' });

    if (!response.ok) {
      throw new Error(`TTS health check failed: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    logger.error('TTS health check error', { module: 'backendProxyService', error });
    throw error;
  }
}

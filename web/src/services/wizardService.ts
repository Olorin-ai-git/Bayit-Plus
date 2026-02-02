/**
 * Wizard Voice Service
 * Integrates with /api/v1/voice/unified backend endpoint
 */

import api from './api';
import logger from '@/utils/logger';

export interface VoiceAction {
  type: string;
  payload: Record<string, any>;
}

export interface GestureState {
  gesture: string;
  duration?: number;
}

export interface WizardVoiceRequest {
  transcript: string;
  language?: string;
  conversation_id?: string;
  platform?: string;
  trigger_type?: 'manual' | 'wake-word';
}

export interface WizardVoiceResponse {
  intent: string;
  spoken_response: string;
  action: VoiceAction | null;
  conversation_id: string;
  confidence: number;
  gesture: GestureState | null;
}

/**
 * Send voice command to wizard backend
 */
export async function sendVoiceCommand(
  request: WizardVoiceRequest
): Promise<WizardVoiceResponse> {
  try {
    const payload = {
      transcript: request.transcript,
      language: request.language || 'en',
      conversation_id: request.conversation_id,
      platform: request.platform || 'web',
      trigger_type: request.trigger_type || 'manual',
    };

    logger.debug('[WizardService] Sending voice command', 'wizardService', payload);

    const response = await api.post('/voice/unified', payload);

    logger.debug('[WizardService] Received wizard response', 'wizardService', {
      intent: response.intent,
      confidence: response.confidence,
    });

    return response;
  } catch (error: any) {
    logger.error('[WizardService] Failed to send voice command', 'wizardService', error);
    throw error;
  }
}

/**
 * Wizard service singleton
 */
export const wizardService = {
  sendVoiceCommand,
};

export default wizardService;

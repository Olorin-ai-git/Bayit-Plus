/**
 * VOD Interaction Hook
 *
 * Manages state and API calls for avatar interactions during VOD playback.
 * Handles:
 * - Detecting interactive moments
 * - Starting/managing interaction sessions
 * - Sending messages to characters
 * - Playing animated responses
 */

import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

export interface InteractiveMoment {
  timestamp: number;
  duration: number;
  scene_context: string;
  character_name: string;
  character_frame_url?: string;
  interaction_prompt: string;
}

export interface DialogueExchange {
  speaker: 'user' | 'character';
  message_text: string;
  audio_url?: string;
  animated_video_url?: string;
  timestamp: string;
}

export interface InteractionSession {
  id: string;
  character_name: string;
  dialogue_exchanges: DialogueExchange[];
  status: 'active' | 'recording' | 'completed';
}

interface UseVODInteractionProps {
  contentId: string;
  profileId: string;
  avatarId: string;
  currentTime: number;
  onPauseRequested: () => void;
  onResumeRequested: () => void;
}

export const useVODInteraction = ({
  contentId,
  profileId,
  avatarId,
  currentTime,
  onPauseRequested,
  onResumeRequested
}: UseVODInteractionProps) => {
  const [moments, setMoments] = useState<InteractiveMoment[]>([]);
  const [currentMoment, setCurrentMoment] = useState<InteractiveMoment | null>(null);
  const [activeSession, setActiveSession] = useState<InteractionSession | null>(null);
  const [isInteracting, setIsInteracting] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [lastCheckedTime, setLastCheckedTime] = useState(0);

  useEffect(() => {
    loadInteractiveMoments();
  }, [contentId]);

  useEffect(() => {
    checkForInteractiveMoment();
  }, [currentTime, moments]);

  const loadInteractiveMoments = async () => {
    try {
      const content = await api.get(`/content/${contentId}`);
      if (content.supports_avatar_interaction && content.interactive_moments) {
        setMoments(content.interactive_moments);
      }
    } catch (error) {
      console.error('Failed to load interactive moments:', error);
    }
  };

  const checkForInteractiveMoment = () => {
    if (isInteracting || moments.length === 0) {
      return;
    }

    const timeDiff = Math.abs(currentTime - lastCheckedTime);
    if (timeDiff < 1) {
      return;
    }

    setLastCheckedTime(currentTime);

    const moment = moments.find(
      (m) => currentTime >= m.timestamp && currentTime <= m.timestamp + 2
    );

    if (moment && !currentMoment) {
      setCurrentMoment(moment);
      onPauseRequested();
    }
  };

  const startInteraction = async () => {
    if (!currentMoment) return;

    setIsInteracting(true);

    try {
      const session = await api.post('/vod-interactions/sessions/start', {
        content_id: contentId,
        profile_id: profileId,
        avatar_id: avatarId,
        moment_timestamp: currentMoment.timestamp,
        character_name: currentMoment.character_name,
        scene_context: currentMoment.scene_context,
        character_frame_url: currentMoment.character_frame_url
      });

      setActiveSession(session);
    } catch (error) {
      console.error('Failed to start interaction:', error);
      setIsInteracting(false);
    }
  };

  const sendMessage = async (messageText: string) => {
    if (!activeSession) return;

    setIsSending(true);

    try {
      const response = await api.post(
        `/vod-interactions/sessions/${activeSession.id}/message`,
        {
          message_text: messageText
        }
      );

      setActiveSession({
        ...activeSession,
        dialogue_exchanges: response.dialogue_exchanges
      });

      return response.character_response;
    } catch (error) {
      console.error('Failed to send message:', error);
      throw error;
    } finally {
      setIsSending(false);
    }
  };

  const completeInteraction = async () => {
    if (!activeSession) return;

    try {
      await api.post(`/vod-interactions/sessions/${activeSession.id}/complete`);

      setActiveSession(null);
      setCurrentMoment(null);
      setIsInteracting(false);

      onResumeRequested();
    } catch (error) {
      console.error('Failed to complete interaction:', error);
    }
  };

  const skipInteraction = () => {
    setCurrentMoment(null);
    setIsInteracting(false);
    onResumeRequested();
  };

  const generateReel = async (sessionIds: string[]) => {
    try {
      const reel = await api.post('/vod-interactions/reels/generate', {
        content_id: contentId,
        profile_id: profileId,
        session_ids: sessionIds
      });

      return reel;
    } catch (error) {
      console.error('Failed to generate reel:', error);
      throw error;
    }
  };

  return {
    currentMoment,
    activeSession,
    isInteracting,
    isSending,
    startInteraction,
    sendMessage,
    completeInteraction,
    skipInteraction,
    generateReel
  };
};

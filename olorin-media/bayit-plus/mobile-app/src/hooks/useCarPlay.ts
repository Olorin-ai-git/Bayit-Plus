/**
 * useCarPlay - CarPlay Integration Hook
 * Manages CarPlay state and audio playback for car integration
 *
 * Features:
 * - Detect CarPlay connection
 * - Control audio playback from CarPlay
 * - Update Now Playing info
 * - Voice command support in car
 */

import { useState, useEffect, useCallback } from 'react';
import { AppState, Platform } from 'react-native';
import { carPlayService } from '../services/carPlay';

import logger from '@/utils/logger';


const moduleLogger = logger.scope('useCarPlay');

export interface CarPlayState {
  isConnected: boolean;
  isPlaying: boolean;
  currentContent: CarPlayContent | null;
}

export interface CarPlayContent {
  id: string;
  title: string;
  artist?: string;
  artwork?: string;
  duration?: number;
  type: 'radio' | 'podcast';
}

interface UseCarPlayOptions {
  autoPlay?: boolean; // Auto-play when CarPlay connects
}

export function useCarPlay(options: UseCarPlayOptions = {}) {
  const { autoPlay = false } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentContent, setCurrentContent] = useState<CarPlayContent | null>(null);

  // Check CarPlay connection status
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const connected = await carPlayService.isConnected();
        setIsConnected(connected);
      } catch (error) {
        moduleLogger.error('Failed to check connection:', error', error);
      }
    };

    checkConnection();

    // Re-check on app state change (foreground/background)
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        checkConnection();
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  // Play content in CarPlay
  const playContent = useCallback(
    async (content: CarPlayContent) => {
      try {
        setCurrentContent(content);
        setIsPlaying(true);

        // Update Now Playing info
        await carPlayService.updateNowPlaying({
          title: content.title,
          artist: content.artist,
          artwork: content.artwork,
          duration: content.duration,
          position: 0,
        });

        moduleLogger.debug('[useCarPlay] Playing content:', content.title);
      } catch (error) {
        moduleLogger.error('Failed to play content:', error', error);
      }
    },
    []
  );

  // Pause playback
  const pause = useCallback(() => {
    setIsPlaying(false);
  }, []);

  // Resume playback
  const resume = useCallback(() => {
    setIsPlaying(true);
  }, []);

  // Stop playback
  const stop = useCallback(() => {
    setIsPlaying(false);
    setCurrentContent(null);
  }, []);

  // Update playback position
  const updatePosition = useCallback(
    async (position: number) => {
      if (!currentContent) return;

      try {
        await carPlayService.updateNowPlaying({
          title: currentContent.title,
          artist: currentContent.artist,
          artwork: currentContent.artwork,
          duration: currentContent.duration,
          position,
        });
      } catch (error) {
        moduleLogger.error('Failed to update position:', error', error);
      }
    },
    [currentContent]
  );

  return {
    isConnected,
    isPlaying,
    currentContent,
    playContent,
    pause,
    resume,
    stop,
    updatePosition,
  };
}

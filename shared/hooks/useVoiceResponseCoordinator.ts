/**
 * Voice Response Coordinator Hook
 * Orchestrates the synchronized execution of voice responses
 *
 * Coordinates:
 * 1. Visual content display (show grid, navigate, highlight)
 * 2. Audio playback (TTS speaking with voice)
 * 3. Command execution (navigate, search, play)
 * 4. Timing and sequencing
 *
 * Flow:
 * [Backend Response] → [Show Content] → [Speak] → [Execute Command]
 */

import { useCallback, useRef, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ttsService } from '../services/ttsService';
import { voiceCommandProcessor } from '../services/voiceCommandProcessor';
import { logger } from '../utils/logger';

// Scoped logger for voice response coordination
const voiceCoordinatorLogger = logger.scope('VoiceCoordinator');

interface ChatResponse {
  message: string;
  conversation_id: string;
  recommendations?: Array<{ id: string; title: string; thumbnail: string }>;
  language?: string;  // Response language (en, he, etc.)
  spoken_response?: string;
  action?: { type: string; payload: Record<string, any> };
  content_ids?: string[];
  visual_action?: 'show_grid' | 'show_details' | 'highlight' | 'scroll' | 'navigate';
  confidence?: number;
}

interface UseVoiceResponseCoordinatorOptions {
  onShowContent?: (contentIds: string[]) => void;
  onNavigate?: (path: string) => void;
  onSearch?: (query: string) => void;
  onPlay?: (contentId: string) => void;
  onScroll?: (direction: 'up' | 'down') => void;
  onHighlight?: (contentIds: string[]) => void;
  onProcessingStart?: () => void;
  onProcessingEnd?: () => void;
}

export function useVoiceResponseCoordinator(
  options: UseVoiceResponseCoordinatorOptions = {}
) {
  const {
    onShowContent,
    onNavigate,
    onSearch,
    onPlay,
    onScroll,
    onHighlight,
    onProcessingStart,
    onProcessingEnd,
  } = options;

  const navigate = useNavigate();
  const isMountedRef = useRef(true);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      // Cancel any pending operations if component unmounts
      abortControllerRef.current?.abort();
    };
  }, []);

  /**
   * Handle voice response and coordinate execution
   */
  const handleVoiceResponse = useCallback(
    async (response: ChatResponse) => {
      voiceCoordinatorLogger.info('Voice response received', {
        hasSpokenResponse: !!response.spoken_response,
        language: response.language,
        hasAction: !!response.action,
        actionType: response.action?.type,
        visualAction: response.visual_action,
        contentIdsCount: response.content_ids?.length,
        recommendationsCount: response.recommendations?.length,
        confidence: response.confidence,
        isMounted: isMountedRef.current,
      });

      if (!isMountedRef.current) {
        voiceCoordinatorLogger.warn('Component unmounted, skipping response', {
          responseId: response.conversation_id,
        });
        return;
      }

      // Cancel any previous operation
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      try {
        voiceCoordinatorLogger.info('Starting voice response processing', {
          conversationId: response.conversation_id,
          language: response.language,
          hasSpokenResponse: !!response.spoken_response,
          actionType: response.action?.type,
          visualAction: response.visual_action,
        });

        voiceCoordinatorLogger.debug('Full response details', {
          message: response.message.substring(0, 100),
          spokenResponse: response.spoken_response?.substring(0, 100),
          action: response.action,
          contentIds: response.content_ids,
          recommendations: response.recommendations?.map(r => ({ id: r.id, title: r.title })),
          confidence: response.confidence,
        });

        onProcessingStart?.();
        setIsProcessing(true);

        // Step 1: Show visual content first (non-blocking)
        if (response.visual_action === 'show_grid' && response.content_ids?.length) {
          onShowContent?.(response.content_ids);

          // Highlight recommendations if available
          if (response.recommendations?.length) {
            onHighlight?.(response.recommendations.map((r) => r.id));
          }
        }

        // Step 2: Execute navigation immediately (don't wait for user response)
        if (response.action?.type === 'navigate') {
          const navigationTarget = response.action.payload?.path || response.action.payload?.target;
          if (navigationTarget) {
            // Map target names to paths if needed
            const pathMap: Record<string, string> = {
              'home': '/',
              'live': '/live',
              'vod': '/vod',
              'movies': '/vod',
              'radio': '/radio',
              'podcasts': '/podcasts',
              'search': '/search',
              'children': '/children',
              'favorites': '/favorites',
              'flows': '/flows',
              'judaism': '/judaism',
              'watchlist': '/watchlist',
              'downloads': '/downloads',
            };

            const path = pathMap[navigationTarget] || (navigationTarget.startsWith('/') ? navigationTarget : `/${navigationTarget}`);
            voiceCoordinatorLogger.info('Executing navigation', {
              path,
              target: navigationTarget,
              actionPayload: response.action.payload,
            });
            // Navigate immediately without waiting for speech to complete
            navigate(path);
          } else {
            voiceCoordinatorLogger.warn('Navigate action missing path/target', {
              action: response.action,
              payload: response.action?.payload,
            });
          }
        }

        // Step 3: Execute search if specified
        if (response.action?.type === 'search' && response.action?.payload?.query) {
          voiceCoordinatorLogger.info('Executing search', {
            query: response.action.payload.query,
            confidence: response.confidence,
          });
          onSearch?.(response.action.payload.query);
        }

        // Step 4: Play content if specified
        if (response.action?.type === 'play' && response.content_ids?.[0]) {
          voiceCoordinatorLogger.info('Executing play', {
            contentId: response.content_ids[0],
            contentIdsCount: response.content_ids.length,
          });
          onPlay?.(response.content_ids[0]);
        } else if (response.action?.type === 'play') {
          voiceCoordinatorLogger.warn('Play action missing content_ids', {
            action: response.action,
            payload: response.action?.payload,
          });
        }

        // Step 5: Handle scrolling
        if (response.action?.type === 'scroll' && response.action?.payload?.direction) {
          voiceCoordinatorLogger.info('Executing scroll', {
            direction: response.action.payload.direction,
          });
          onScroll?.(response.action.payload.direction);
        }

        // Step 6: Speak the response with TTS
        // Use spoken_response if available (optimized for voice), fall back to message
        const textToSpeak = response.spoken_response || response.message;

        voiceCoordinatorLogger.info('Preparing TTS speech', {
          textLength: textToSpeak?.length,
          textPreview: textToSpeak?.substring(0, 100),
          hasSpokenResponse: !!response.spoken_response,
          language: response.language,
        });

        if (textToSpeak) {
          // Set language for TTS if available
          const language = response.language === 'en' ? 'en' : 'he';
          voiceCoordinatorLogger.info('Setting TTS language', {
            language,
            responseLanguage: response.language,
          });
          ttsService.setLanguage(language);

          voiceCoordinatorLogger.debug('Invoking TTS speak', {
            textPreview: textToSpeak.substring(0, 50),
            textLength: textToSpeak.length,
            language,
          });

          // Speak the response
          await ttsService.speak(
            textToSpeak,
            'normal', // priority
            undefined, // voiceId - uses default
            {
              onStart: () => {
                voiceCoordinatorLogger.info('TTS playback started', {
                  textLength: textToSpeak.length,
                  language,
                });
              },
              onComplete: () => {
                voiceCoordinatorLogger.info('TTS playback completed', {
                  textLength: textToSpeak.length,
                  language,
                });
                if (isMountedRef.current) {
                  onProcessingEnd?.();
                }
              },
              onError: (error) => {
                voiceCoordinatorLogger.error('TTS playback failed', {
                  error: error instanceof Error ? error.message : String(error),
                  textLength: textToSpeak.length,
                  language,
                });
                if (isMountedRef.current) {
                  onProcessingEnd?.();
                }
              },
            }
          );
        } else {
          voiceCoordinatorLogger.warn('No text to speak, skipping TTS', {
            hasSpokenResponse: !!response.spoken_response,
            hasMessage: !!response.message,
          });
          onProcessingEnd?.();
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          // Operation was cancelled - don't process error
          voiceCoordinatorLogger.debug('Voice response processing cancelled', {
            conversationId: response.conversation_id,
          });
          return;
        }

        voiceCoordinatorLogger.error('Voice response processing failed', {
          error: error instanceof Error ? error.message : String(error),
          conversationId: response.conversation_id,
          actionType: response.action?.type,
          stack: error instanceof Error ? error.stack : undefined,
        });
        if (isMountedRef.current) {
          onProcessingEnd?.();
        }
      } finally {
        if (isMountedRef.current) {
          setIsProcessing(false);
        }
      }
    },
    [navigate, onShowContent, onNavigate, onSearch, onPlay, onScroll, onHighlight, onProcessingStart, onProcessingEnd]
  );

  /**
   * Handle voice command from transcript
   * Processes through command processor, then coordinates response
   */
  const handleVoiceCommand = useCallback(
    async (transcript: string, chatResponse: ChatResponse) => {
      if (!isMountedRef.current) return;

      try {
        // Use voice command processor to enhance interpretation
        const command = voiceCommandProcessor.processVoiceInput(transcript);

        voiceCoordinatorLogger.info('Voice command processed', {
          transcript: transcript.substring(0, 100),
          intent: command.intent,
          confidence: command.confidence,
          actionType: command.action.type,
          visualAction: command.visualAction,
          hasSpokenResponse: !!command.spokenResponse,
        });

        // Merge command insights with chat response
        const enhancedResponse: ChatResponse = {
          ...chatResponse,
          action: command.action,
          spoken_response: command.spokenResponse || chatResponse.spoken_response,
          visual_action: command.visualAction || chatResponse.visual_action,
          confidence: command.confidence,
        };

        // Coordinate the full response execution
        await handleVoiceResponse(enhancedResponse);
      } catch (error) {
        voiceCoordinatorLogger.error('Voice command processing failed', {
          error: error instanceof Error ? error.message : String(error),
          transcript: transcript.substring(0, 100),
          stack: error instanceof Error ? error.stack : undefined,
        });
      }
    },
    [handleVoiceResponse]
  );

  /**
   * Cancel any ongoing processing
   */
  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    ttsService.stop();
    setIsProcessing(false);
  }, []);

  return {
    // State
    isProcessing,

    // Actions
    handleVoiceResponse,
    handleVoiceCommand,
    cancel,
  };
}

export default useVoiceResponseCoordinator;

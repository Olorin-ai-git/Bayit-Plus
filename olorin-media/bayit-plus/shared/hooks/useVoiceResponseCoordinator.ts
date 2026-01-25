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
      console.log('[VoiceResponseCoordinator] handleVoiceResponse called with:', {
        hasSpokenResponse: !!response.spoken_response,
        language: response.language,
        hasAction: !!response.action,
        isMounted: isMountedRef.current,
      });

      if (!isMountedRef.current) {
        console.warn('[VoiceResponseCoordinator] Component not mounted, skipping');
        return;
      }

      // Cancel any previous operation
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      try {
        console.log('[VoiceResponseCoordinator] Starting processing');
        console.log('[VoiceResponseCoordinator] Full response object:', JSON.stringify(response, null, 2));
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
            console.log('[VoiceResponseCoordinator] Navigating to:', path, '(target:', navigationTarget + ')');
            // Navigate immediately without waiting for speech to complete
            navigate(path);
          } else {
            console.warn('[VoiceResponseCoordinator] Navigate action missing path or target:', response.action);
          }
        }

        // Step 3: Execute search if specified
        if (response.action?.type === 'search' && response.action?.payload?.query) {
          console.log('[VoiceResponseCoordinator] Searching for:', response.action.payload.query);
          onSearch?.(response.action.payload.query);
        }

        // Step 4: Play content if specified
        if (response.action?.type === 'play' && response.content_ids?.[0]) {
          console.log('[VoiceResponseCoordinator] Playing content:', response.content_ids[0]);
          onPlay?.(response.content_ids[0]);
        } else if (response.action?.type === 'play') {
          console.warn('[VoiceResponseCoordinator] Play action missing content_ids:', response.action);
        }

        // Step 5: Handle scrolling
        if (response.action?.type === 'scroll' && response.action?.payload?.direction) {
          console.log('[VoiceResponseCoordinator] Scrolling:', response.action.payload.direction);
          onScroll?.(response.action.payload.direction);
        }

        // Step 6: Speak the response with TTS
        // Use spoken_response if available (optimized for voice), fall back to message
        const textToSpeak = response.spoken_response || response.message;

        console.log('[VoiceResponseCoordinator] Ready to speak, textToSpeak length:', textToSpeak?.length);
        console.log('[VoiceResponseCoordinator] textToSpeak:', textToSpeak?.substring(0, 100));

        if (textToSpeak) {
          // Set language for TTS if available
          const language = response.language === 'en' ? 'en' : 'he';
          console.log('[VoiceResponseCoordinator] Setting TTS language to:', language);
          ttsService.setLanguage(language);

          console.log('[VoiceResponseCoordinator] Calling ttsService.speak() with text:', textToSpeak.substring(0, 50));
          console.log('[VoiceResponseCoordinator] ttsService:', ttsService);

          // Speak the response
          await ttsService.speak(
            textToSpeak,
            'normal', // priority
            undefined, // voiceId - uses default
            {
              onStart: () => {
                console.log('[VoiceResponseCoordinator] TTS started');
              },
              onComplete: () => {
                console.log('[VoiceResponseCoordinator] TTS completed');
                if (isMountedRef.current) {
                  onProcessingEnd?.();
                }
              },
              onError: (error) => {
                console.error('[VoiceResponseCoordinator] TTS Error:', error);
                if (isMountedRef.current) {
                  onProcessingEnd?.();
                }
              },
            }
          );
        } else {
          console.warn('[VoiceResponseCoordinator] No text to speak, calling onProcessingEnd');
          onProcessingEnd?.();
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          // Operation was cancelled - don't process error
          return;
        }

        console.error('Error handling voice response:', error);
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

        // Log confidence and intent
        console.log('[Voice Command]', {
          intent: command.intent,
          confidence: command.confidence,
          type: command.action.type,
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
        console.error('Error processing voice command:', error);
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

/**
 * useTVAvatarFocus Hook
 *
 * Handles tvOS focus navigation and Siri Remote gestures for the avatar interface.
 * Provides focus management for avatar states, voice activation, and dismissal.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, findNodeHandle } from 'react-native';
import { AvatarCoreState, AvatarVisualForm } from '../constants/avatarStates';
import { GestureType } from '../constants/avatarGestures';

// TVEventHandler only exists on TV platforms - import conditionally
let TVEventHandler: unknown = null;
if (Platform.OS !== 'web') {
  try {
    TVEventHandler = require('react-native').TVEventHandler;
  } catch {
    // TVEventHandler not available on this platform
  }
}

/** Hardware event type from tvOS remote */
interface HWEvent {
  eventType: string;
  eventKeyAction?: number;
  tag?: number;
}

/**
 * tvOS Remote event types
 */
type TVRemoteEventType =
  | 'select'
  | 'playPause'
  | 'longSelect'
  | 'swipeUp'
  | 'swipeDown'
  | 'swipeLeft'
  | 'swipeRight'
  | 'menu';

/**
 * Focus zone for avatar interaction
 */
export type AvatarFocusZone =
  | 'avatar' // Main avatar area
  | 'dismiss' // Dismiss button/action
  | 'microphone' // Voice activation
  | 'suggestions' // Suggestion chips
  | 'content'; // Content results area

interface TVAvatarFocusOptions {
  /** Current avatar state */
  avatarState: AvatarCoreState;
  /** Current visual form */
  visualForm: AvatarVisualForm;
  /** Callback when voice activation requested */
  onVoiceActivate?: () => void;
  /** Callback when dismissal requested */
  onDismiss?: () => void;
  /** Callback when selection made */
  onSelect?: (zone: AvatarFocusZone) => void;
  /** Callback when focus zone changes */
  onFocusZoneChange?: (zone: AvatarFocusZone) => void;
  /** Callback for directional navigation */
  onNavigate?: (direction: 'up' | 'down' | 'left' | 'right') => void;
  /** Enable haptic feedback */
  enableHaptics?: boolean;
  /** Initial focus zone */
  initialFocusZone?: AvatarFocusZone;
}

interface TVAvatarFocusReturn {
  /** Current focused zone */
  focusedZone: AvatarFocusZone;
  /** Whether avatar is focused */
  isAvatarFocused: boolean;
  /** Set focus to specific zone */
  setFocusZone: (zone: AvatarFocusZone) => void;
  /** Request voice activation */
  activateVoice: () => void;
  /** Request dismissal */
  dismissAvatar: () => void;
  /** tvOS focus props for avatar container */
  avatarFocusProps: Record<string, unknown>;
  /** Ref for avatar container */
  avatarRef: React.RefObject<unknown>;
  /** Whether running on tvOS */
  isTVOS: boolean;
  /** Focus the avatar */
  focusAvatar: () => void;
}

/**
 * Hook for managing tvOS focus navigation for the avatar interface
 */
export function useTVAvatarFocus(
  options: TVAvatarFocusOptions
): TVAvatarFocusReturn {
  const {
    avatarState,
    visualForm,
    onVoiceActivate,
    onDismiss,
    onSelect,
    onFocusZoneChange,
    onNavigate,
    enableHaptics = true,
    initialFocusZone = 'avatar',
  } = options;

  const [focusedZone, setFocusedZone] = useState<AvatarFocusZone>(initialFocusZone);
  const [isAvatarFocused, setIsAvatarFocused] = useState(false);

  const avatarRef = useRef<unknown>(null);
  const tvEventHandlerRef = useRef<unknown>(null);

  const isTVOS = Platform.isTV && Platform.OS === 'ios';

  /**
   * Handle tvOS remote events
   */
  const handleTVEvent = useCallback(
    (evt: HWEvent) => {
      if (!isTVOS || !isAvatarFocused) return;

      const eventType = evt.eventType as TVRemoteEventType;

      switch (eventType) {
        case 'select':
          // Select pressed - activate current zone
          if (focusedZone === 'microphone') {
            onVoiceActivate?.();
          } else if (focusedZone === 'dismiss') {
            onDismiss?.();
          } else {
            onSelect?.(focusedZone);
          }
          break;

        case 'playPause':
          // Play/Pause - toggle voice activation
          if (avatarState === 'dormant') {
            onVoiceActivate?.();
          } else if (avatarState === 'listening' || avatarState === 'responding') {
            onDismiss?.();
          }
          break;

        case 'longSelect':
          // Long press - show dismissal option
          setFocusedZone('dismiss');
          onFocusZoneChange?.('dismiss');
          break;

        case 'swipeUp':
          if (focusedZone === 'content') {
            setFocusedZone('suggestions');
          } else if (focusedZone === 'suggestions') {
            setFocusedZone('avatar');
          }
          onNavigate?.('up');
          break;

        case 'swipeDown':
          if (focusedZone === 'avatar') {
            setFocusedZone('suggestions');
          } else if (focusedZone === 'suggestions') {
            setFocusedZone('content');
          }
          onNavigate?.('down');
          break;

        case 'swipeLeft':
          if (focusedZone === 'avatar') {
            setFocusedZone('microphone');
          }
          onNavigate?.('left');
          break;

        case 'swipeRight':
          if (focusedZone === 'microphone') {
            setFocusedZone('avatar');
          } else if (focusedZone === 'avatar') {
            setFocusedZone('dismiss');
          }
          onNavigate?.('right');
          break;

        case 'menu':
          // Menu button - dismiss or go back
          if (visualForm === 'wizard') {
            onDismiss?.();
          }
          break;
      }
    },
    [
      isTVOS,
      isAvatarFocused,
      focusedZone,
      avatarState,
      visualForm,
      onVoiceActivate,
      onDismiss,
      onSelect,
      onFocusZoneChange,
      onNavigate,
    ]
  );

  /**
   * Set up tvOS event handler
   */
  useEffect(() => {
    if (!isTVOS || !TVEventHandler) return;

    // Create handler from dynamically imported class
    const HandlerClass = TVEventHandler as new () => {
      enable: (component: unknown, callback: (evt: HWEvent) => void) => void;
      disable: () => void;
    };
    const handler = new HandlerClass();
    handler.enable(undefined, handleTVEvent);
    tvEventHandlerRef.current = handler;

    return () => {
      handler.disable();
      tvEventHandlerRef.current = null;
    };
  }, [isTVOS, handleTVEvent]);

  /**
   * Notify focus zone changes
   */
  useEffect(() => {
    onFocusZoneChange?.(focusedZone);
  }, [focusedZone, onFocusZoneChange]);

  /**
   * Set focus zone
   */
  const setFocusZone = useCallback((zone: AvatarFocusZone) => {
    setFocusedZone(zone);
  }, []);

  /**
   * Activate voice input
   */
  const activateVoice = useCallback(() => {
    if (avatarState === 'dormant') {
      onVoiceActivate?.();
    }
  }, [avatarState, onVoiceActivate]);

  /**
   * Dismiss the avatar
   */
  const dismissAvatar = useCallback(() => {
    if (visualForm === 'wizard') {
      onDismiss?.();
    }
  }, [visualForm, onDismiss]);

  /**
   * Focus the avatar container
   */
  const focusAvatar = useCallback(() => {
    if (isTVOS && avatarRef.current) {
      const nodeHandle = findNodeHandle(avatarRef.current as unknown as number);
      if (nodeHandle) {
        (avatarRef.current as { focus?: () => void }).focus?.();
      }
    }
    setIsAvatarFocused(true);
    setFocusedZone('avatar');
  }, [isTVOS]);

  /**
   * Handle focus events
   */
  const handleFocus = useCallback(() => {
    setIsAvatarFocused(true);
  }, []);

  const handleBlur = useCallback(() => {
    setIsAvatarFocused(false);
  }, []);

  /**
   * tvOS focus props for avatar container
   */
  const avatarFocusProps = isTVOS
    ? {
        accessible: true,
        accessibilityRole: 'button' as const,
        accessibilityLabel: 'Olorin wizard assistant',
        accessibilityHint:
          avatarState === 'dormant'
            ? 'Press to activate voice assistant'
            : 'Press to interact with the assistant',
        accessibilityState: {
          selected: focusedZone === 'avatar',
        },
        hasTVPreferredFocus: focusedZone === 'avatar',
        isTVSelectable: true,
        onFocus: handleFocus,
        onBlur: handleBlur,
        tvParallaxProperties: {
          enabled: visualForm === 'wizard',
          shiftDistanceX: 3.0,
          shiftDistanceY: 3.0,
          tiltAngle: 0.08,
          magnification: 1.15,
          pressMagnification: 1.05,
          pressDuration: 0.2,
        },
      }
    : {};

  return {
    focusedZone,
    isAvatarFocused,
    setFocusZone,
    activateVoice,
    dismissAvatar,
    avatarFocusProps,
    avatarRef,
    isTVOS,
    focusAvatar,
  };
}

/**
 * Focus zone configuration for avatar layout
 */
export const AVATAR_FOCUS_ZONES: Record<AvatarFocusZone, { label: string; hint: string }> = {
  avatar: {
    label: 'Olorin avatar',
    hint: 'Press to interact with the wizard',
  },
  dismiss: {
    label: 'Dismiss',
    hint: 'Press to dismiss the wizard',
  },
  microphone: {
    label: 'Voice input',
    hint: 'Press to speak to the wizard',
  },
  suggestions: {
    label: 'Suggestions',
    hint: 'Navigate to select a suggestion',
  },
  content: {
    label: 'Results',
    hint: 'Navigate to select a result',
  },
};

/**
 * Get tvOS-optimized avatar dimensions
 * tvOS requires larger sizes for 10-foot UI
 */
export function getTVOSAvatarSize(baseSize: number): number {
  return Platform.isTV ? baseSize * 1.5 : baseSize;
}

/**
 * Get focus ring style for tvOS
 */
export function getTVOSFocusRingStyle(isFocused: boolean) {
  if (!Platform.isTV || !isFocused) {
    return {};
  }

  return {
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 12,
    borderWidth: 3,
    borderColor: '#7c3aed',
  };
}

/**
 * Watch Party Text Overlay
 *
 * A simplified watch party overlay for platforms without WebRTC audio support (e.g., tvOS).
 * Slides in from the side with text chat, participant list, and sync status.
 * No audio controls or speaking indicators.
 */
import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import WatchPartyTextPanel from './WatchPartyTextPanel';
import { spacing, borderRadius } from '../../theme';
import { isTV } from '../../utils/platform';

const SCREEN_WIDTH = Dimensions.get('window').width;
const PANEL_WIDTH = Math.min(400, SCREEN_WIDTH * 0.35);

interface Party {
  id: string;
  host_id: string;
  room_code: string;
  chat_enabled: boolean;
}

interface Participant {
  user_id: string;
  user_name: string;
  is_muted: boolean;
  is_speaking: boolean;
}

interface ChatMessage {
  id: string;
  user_id: string;
  user_name: string;
  content: string;
  message_type: string;
  created_at: string;
}

interface WatchPartyTextOverlayProps {
  visible: boolean;
  onClose: () => void;
  party: Party | null;
  participants: Participant[];
  messages: ChatMessage[];
  isHost: boolean;
  isSynced: boolean;
  hostPaused: boolean;
  currentUserId: string;
  onLeave: () => void;
  onEnd: () => void;
  onSendMessage: (message: string, type?: string) => void;
  autoHideDelay?: number;
}

export const WatchPartyTextOverlay: React.FC<WatchPartyTextOverlayProps> = ({
  visible,
  onClose,
  party,
  participants,
  messages,
  isHost,
  isSynced,
  hostPaused,
  currentUserId,
  onLeave,
  onEnd,
  onSendMessage,
  autoHideDelay = 5000,
}) => {
  const slideAnim = useRef(new Animated.Value(-PANEL_WIDTH)).current;
  const [isInteracting, setIsInteracting] = useState(false);
  const hideTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        useNativeDriver: true,
      }).start();
      resetHideTimer();
    } else {
      Animated.timing(slideAnim, {
        toValue: -PANEL_WIDTH,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }

    return () => {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
    };
  }, [visible]);

  const resetHideTimer = () => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
    }
    if (isTV && autoHideDelay > 0 && !isInteracting) {
      hideTimeoutRef.current = setTimeout(() => {
        onClose();
      }, autoHideDelay);
    }
  };

  const handleInteractionStart = () => {
    setIsInteracting(true);
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
    }
  };

  const handleInteractionEnd = () => {
    setIsInteracting(false);
    resetHideTimer();
  };

  if (!party || !visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        { transform: [{ translateX: slideAnim }] },
      ]}
    >
      <TouchableOpacity
        activeOpacity={1}
        style={styles.touchArea}
        onPressIn={handleInteractionStart}
        onPressOut={handleInteractionEnd}
      >
        <WatchPartyTextPanel
          party={party}
          participants={participants}
          messages={messages}
          isHost={isHost}
          isSynced={isSynced}
          hostPaused={hostPaused}
          currentUserId={currentUserId}
          onLeave={onLeave}
          onEnd={onEnd}
          onSendMessage={onSendMessage}
        />
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: PANEL_WIDTH,
    zIndex: 100,
    padding: spacing.md,
  },
  touchArea: {
    flex: 1,
  },
});

export default WatchPartyTextOverlay;

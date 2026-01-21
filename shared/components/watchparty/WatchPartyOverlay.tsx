import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Animated,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { GlassView } from '../ui/GlassView';
import WatchPartyHeader from './WatchPartyHeader';
import WatchPartyParticipants from './WatchPartyParticipants';
import WatchPartyChat from './WatchPartyChat';
import WatchPartyChatInput from './WatchPartyChatInput';
import { colors, spacing, borderRadius } from '../../theme';
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

interface WatchPartyOverlayProps {
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

export const WatchPartyOverlay: React.FC<WatchPartyOverlayProps> = ({
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
  const { t } = useTranslation();
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
      className="absolute top-0 left-0 bottom-0 z-[100]"
      style={[
        { width: PANEL_WIDTH, transform: [{ translateX: slideAnim }] },
      ]}
    >
      <TouchableOpacity
        activeOpacity={1}
        className="flex-1"
        onPressIn={handleInteractionStart}
        onPressOut={handleInteractionEnd}
      >
        <GlassView className="flex-1 p-6 gap-4 rounded-tr-2xl rounded-br-2xl rounded-tl-none rounded-bl-none" intensity="high">
          <WatchPartyHeader
            roomCode={party.room_code}
            isHost={isHost}
            isSynced={isSynced}
            hostPaused={hostPaused}
            onLeave={onLeave}
            onEnd={onEnd}
          />

          <View className="h-px bg-white/20 my-1" />

          <WatchPartyParticipants
            participants={participants}
            hostId={party.host_id}
            currentUserId={currentUserId}
            horizontal={isTV}
          />

          {party.chat_enabled && (
            <>
              <View className="h-px bg-white/20 my-1" />
              <View className="flex-1 gap-4">
                <WatchPartyChat
                  messages={messages}
                  currentUserId={currentUserId}
                  maxHeight={isTV ? 200 : 250}
                />
                <WatchPartyChatInput
                  onSend={onSendMessage}
                  disabled={!party.chat_enabled}
                />
              </View>
            </>
          )}
        </GlassView>
      </TouchableOpacity>
    </Animated.View>
  );
};

export default WatchPartyOverlay;

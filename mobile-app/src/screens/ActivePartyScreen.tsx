/**
 * Active Watch Party Screen
 *
 * Shows synced video playback with chat and participant list.
 * Uses shared watchPartyStore for WebSocket state management.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useWatchPartyStore } from '@bayit/shared-stores/watchPartyStore';
import { useAuthStore } from '@bayit/shared-stores/authStore';
import {
  GlassButton,
  GlassInput,
  GlassCard,
  GlassModal,
  GlassAvatar,
  GlassBadge,
  colors,
  spacing,
  borderRadius,
} from '@olorin/glass-ui/native';
import { logger } from '../utils/logger';

const log = logger.scope('ActivePartyScreen');

type RouteParams = { partyId: string };

export const ActivePartyScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const route = useRoute<RouteProp<Record<string, RouteParams>, string>>();
  const partyId = route.params?.partyId;

  const user = useAuthStore((s) => s.user);
  const {
    party,
    participants,
    messages,
    isConnected,
    isConnecting,
    error,
    isHost,
    syncedPosition,
    isPlaying,
    connect,
    sendMessage: storeSendMessage,
    syncPlayback,
    leaveParty,
    loadChatHistory,
    clearError,
  } = useWatchPartyStore();

  const [chatInput, setChatInput] = useState('');
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const chatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (partyId) {
      connect(partyId);
      loadChatHistory();
    }
  }, [partyId, connect, loadChatHistory]);

  // Auto-scroll chat on new messages
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => chatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length]);

  const handleSendMessage = useCallback(() => {
    const text = chatInput.trim();
    if (!text) return;
    storeSendMessage(text);
    setChatInput('');
  }, [chatInput, storeSendMessage]);

  const handleLeave = useCallback(async () => {
    setShowLeaveConfirm(false);
    try {
      await leaveParty();
      log.info('Left watch party');
      navigation.goBack();
    } catch (err) {
      log.error('Failed to leave party', err);
    }
  }, [leaveParty, navigation]);

  const handlePlayPause = useCallback(() => {
    if (isHost) {
      syncPlayback(syncedPosition, !isPlaying);
    }
  }, [isHost, syncPlayback, syncedPosition, isPlaying]);

  if (isConnecting) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>{t('watchParty.connecting')}</Text>
      </View>
    );
  }

  const renderMessage = ({ item }: { item: typeof messages[0] }) => {
    const isOwn = item.user_id === user?.id;
    return (
      <View style={[styles.messageRow, isOwn && styles.messageRowOwn]}>
        {!isOwn && (
          <Text style={styles.messageSender}>{item.user_name}</Text>
        )}
        <View style={[styles.messageBubble, isOwn && styles.messageBubbleOwn]}>
          <Text style={styles.messageText}>{item.message}</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Video Area (placeholder - actual player integration is a follow-up) */}
      <View style={styles.videoArea}>
        <View style={styles.videoPlaceholder}>
          <Text style={styles.videoTitle} numberOfLines={1}>
            {party?.content_id ? t('watchParty.nowWatching') : t('watchParty.noContent')}
          </Text>

          {/* Playback Controls */}
          {isHost && (
            <GlassButton
              variant="secondary"
              size="small"
              onPress={handlePlayPause}
              style={styles.playButton}
            >
              {isPlaying ? t('watchParty.pause') : t('watchParty.play')}
            </GlassButton>
          )}
        </View>

        {/* Participants Bar */}
        <View style={styles.participantsBar}>
          <View style={styles.participantAvatars}>
            {participants.slice(0, 5).map((p) => (
              <GlassAvatar
                key={p.user_id}
                name={p.user_name}
                size="sm"
                style={styles.participantAvatar}
              />
            ))}
            {participants.length > 5 && (
              <GlassBadge variant="default" size="sm">
                +{participants.length - 5}
              </GlassBadge>
            )}
          </View>

          <View style={styles.partyInfo}>
            {party?.room_code && (
              <Text style={styles.roomCode}>
                {t('watchParty.code')}: {party.room_code}
              </Text>
            )}
            {!isConnected && (
              <GlassBadge variant="warning" size="sm">
                {t('watchParty.disconnected')}
              </GlassBadge>
            )}
          </View>
        </View>
      </View>

      {/* Chat Area */}
      <KeyboardAvoidingView
        style={styles.chatArea}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={90}
      >
        {error && (
          <GlassCard style={styles.errorCard}>
            <Text style={styles.errorText}>{error}</Text>
            <GlassButton variant="ghost" size="small" onPress={clearError}>
              {t('common.dismiss')}
            </GlassButton>
          </GlassCard>
        )}

        <FlatList
          ref={chatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          style={styles.chatList}
          contentContainerStyle={styles.chatContent}
          showsVerticalScrollIndicator={false}
        />

        {/* Chat Input */}
        {party?.chat_enabled && (
          <View style={styles.chatInputRow}>
            <GlassInput
              placeholder={t('watchParty.typeMessage')}
              value={chatInput}
              onChangeText={setChatInput}
              onSubmitEditing={handleSendMessage}
              returnKeyType="send"
              style={styles.chatInputField}
            />
            <GlassButton
              variant="primary"
              size="small"
              onPress={handleSendMessage}
              disabled={!chatInput.trim()}
            >
              {t('watchParty.send')}
            </GlassButton>
          </View>
        )}

        {/* Leave Button */}
        <GlassButton
          variant="destructive"
          size="small"
          onPress={() => setShowLeaveConfirm(true)}
          style={styles.leaveButton}
        >
          {t('watchParty.leaveParty')}
        </GlassButton>
      </KeyboardAvoidingView>

      {/* Leave Confirmation */}
      <GlassModal
        visible={showLeaveConfirm}
        onClose={() => setShowLeaveConfirm(false)}
        title={t('watchParty.leaveConfirmTitle')}
      >
        <Text style={styles.confirmText}>
          {t('watchParty.leaveConfirmMessage')}
        </Text>
        <View style={styles.confirmActions}>
          <GlassButton
            variant="secondary"
            onPress={() => setShowLeaveConfirm(false)}
            style={styles.confirmButton}
          >
            {t('common.cancel')}
          </GlassButton>
          <GlassButton
            variant="destructive"
            onPress={handleLeave}
            style={styles.confirmButton}
          >
            {t('watchParty.leave')}
          </GlassButton>
        </View>
      </GlassModal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: 16,
    color: colors.textSecondary,
  },
  videoArea: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  videoPlaceholder: {
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
  },
  videoTitle: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  playButton: {
    minWidth: 100,
  },
  participantsBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.glassMedium,
  },
  participantAvatars: {
    flexDirection: 'row',
    gap: -8,
  },
  participantAvatar: {
    borderWidth: 2,
    borderColor: colors.background,
  },
  partyInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  roomCode: {
    fontSize: 12,
    color: colors.textMuted,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  chatArea: {
    flex: 1,
    paddingHorizontal: spacing.md,
  },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.sm,
    marginTop: spacing.sm,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    color: colors.error,
  },
  chatList: {
    flex: 1,
  },
  chatContent: {
    paddingVertical: spacing.md,
    gap: spacing.xs,
  },
  messageRow: {
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
  },
  messageRowOwn: {
    alignItems: 'flex-end',
  },
  messageSender: {
    fontSize: 11,
    color: colors.textMuted,
    marginBottom: 2,
    marginLeft: spacing.xs,
  },
  messageBubble: {
    maxWidth: '75%',
    padding: spacing.sm,
    backgroundColor: colors.glassMedium,
    borderRadius: borderRadius.md,
  },
  messageBubbleOwn: {
    backgroundColor: colors.primary700,
  },
  messageText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  chatInputRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  chatInputField: {
    flex: 1,
  },
  leaveButton: {
    alignSelf: 'center',
    marginVertical: spacing.sm,
  },
  confirmText: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  confirmActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  confirmButton: {
    flex: 1,
  },
});

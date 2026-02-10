import React, { useState } from 'react';
import { TouchableOpacity, Text, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { shareWatchPartyInvite } from '../../services/shareService';

interface WatchPartyShareButtonProps {
  roomCode: string;
  contentTitle?: string;
  variant?: 'primary' | 'secondary';
  onShareSuccess?: () => void;
}

export function WatchPartyShareButton({
  roomCode,
  contentTitle,
  variant = 'primary',
  onShareSuccess,
}: WatchPartyShareButtonProps) {
  const { t } = useTranslation();
  const [isSharing, setIsSharing] = useState(false);

  const handleShare = async () => {
    setIsSharing(true);
    try {
      const success = await shareWatchPartyInvite(roomCode, contentTitle);
      if (success) {
        onShareSuccess?.();
        Alert.alert(
          t('common.success', 'Success'),
          t('watchParty.inviteShared', 'Watch Party invite sent!')
        );
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Share failed');
      Alert.alert(t('common.error', 'Error'), err.message);
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <TouchableOpacity
      style={[styles.button, variant === 'primary' ? styles.buttonPrimary : styles.buttonSecondary]}
      onPress={handleShare}
      disabled={isSharing}
      activeOpacity={0.7}
    >
      {isSharing ? (
        <ActivityIndicator size="small" color={variant === 'primary' ? '#fff' : '#A855F7'} />
      ) : (
        <>
          <Text style={styles.icon}>↗</Text>
          <Text style={[styles.text, variant === 'primary' ? styles.textPrimary : styles.textSecondary]}>
            {t('watchParty.inviteFriends', 'Invite Friends')}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  buttonPrimary: {
    backgroundColor: '#A855F7',
  },
  buttonSecondary: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  icon: {
    fontSize: 18,
    color: '#fff',
  },
  text: {
    fontSize: 14,
    fontWeight: '600',
  },
  textPrimary: {
    color: '#fff',
  },
  textSecondary: {
    color: '#fff',
  },
});

import React, { useState } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import Clipboard from '@react-native-clipboard/clipboard';
import { GlassView } from '../ui/GlassView';
import { GlassButton } from '../ui/GlassButton';
import WatchPartySyncIndicator from './WatchPartySyncIndicator';
import { colors, spacing, borderRadius, fontSize } from '../../theme';

interface WatchPartyHeaderProps {
  roomCode: string;
  isHost: boolean;
  isSynced: boolean;
  hostPaused: boolean;
  onLeave: () => void;
  onEnd: () => void;
}

export const WatchPartyHeader: React.FC<WatchPartyHeaderProps> = ({
  roomCode,
  isHost,
  isSynced,
  hostPaused,
  onLeave,
  onEnd,
}) => {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const handleCopyCode = async () => {
    if (Platform.OS === 'web') {
      await navigator.clipboard.writeText(roomCode);
    } else {
      Clipboard.setString(roomCode);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <View style={styles.container}>
      <View style={styles.titleRow}>
        <Text style={styles.title}>{t('watchParty.title')}</Text>
        <WatchPartySyncIndicator
          isHost={isHost}
          isSynced={isSynced}
          hostPaused={hostPaused}
        />
      </View>

      <GlassView style={styles.codeContainer} intensity="low">
        <View style={styles.codeInfo}>
          <Text style={styles.codeLabel}>{t('watchParty.roomCode')}:</Text>
          <Text style={styles.codeValue}>{roomCode}</Text>
        </View>
        <GlassButton
          title={copied ? t('watchParty.codeCopied') : t('watchParty.copyCode')}
          onPress={handleCopyCode}
          variant="ghost"
          size="sm"
        />
      </GlassView>

      <View style={styles.actions}>
        {isHost ? (
          <GlassButton
            title={t('watchParty.end')}
            onPress={onEnd}
            variant="danger"
            size="sm"
            fullWidth
          />
        ) : (
          <GlassButton
            title={t('watchParty.leave')}
            onPress={onLeave}
            variant="secondary"
            size="sm"
            fullWidth
          />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text,
  },
  codeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  codeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  codeLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  codeValue: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: 2,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
});

export default WatchPartyHeader;

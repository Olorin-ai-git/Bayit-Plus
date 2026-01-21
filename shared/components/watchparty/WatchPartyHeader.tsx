import React, { useState } from 'react';
import { View, Text, Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import Clipboard from '@react-native-clipboard/clipboard';
import { GlassView } from '../ui/GlassView';
import { GlassButton } from '../ui/GlassButton';
import WatchPartySyncIndicator from './WatchPartySyncIndicator';

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
    <View className="gap-4">
      <View className="flex-row items-center justify-between">
        <Text className="text-lg font-semibold text-white">{t('watchParty.title')}</Text>
        <WatchPartySyncIndicator
          isHost={isHost}
          isSynced={isSynced}
          hostPaused={hostPaused}
        />
      </View>

      <GlassView className="flex-row items-center justify-between py-3 px-4" intensity="low">
        <View className="flex-row items-center gap-3">
          <Text className="text-xs text-white/50">{t('watchParty.roomCode')}:</Text>
          <Text
            className="text-base font-bold text-white tracking-wider"
            style={{ fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }}
          >
            {roomCode}
          </Text>
        </View>
        <GlassButton
          title={copied ? t('watchParty.codeCopied') : t('watchParty.copyCode')}
          onPress={handleCopyCode}
          variant="ghost"
          size="sm"
        />
      </GlassView>

      <View className="flex-row gap-3">
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

export default WatchPartyHeader;

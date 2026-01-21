import React from 'react';
import { View, Text, Animated } from 'react-native';
import { useTranslation } from 'react-i18next';

interface WatchPartySyncIndicatorProps {
  isHost: boolean;
  isSynced: boolean;
  hostPaused: boolean;
}

export const WatchPartySyncIndicator: React.FC<WatchPartySyncIndicatorProps> = ({
  isHost,
  isSynced,
  hostPaused,
}) => {
  const { t } = useTranslation();

  if (isHost) return null;

  const getState = () => {
    if (hostPaused) {
      return {
        text: t('watchParty.hostPaused'),
        className: 'bg-amber-500/10 border-amber-500/20 text-amber-500',
      };
    }
    if (isSynced) {
      return {
        text: t('watchParty.synced'),
        className: 'bg-green-500/10 border-green-500/20 text-green-500',
      };
    }
    return {
      text: t('watchParty.syncing'),
      className: 'bg-purple-500/30 border-purple-500/30 text-purple-500',
    };
  };

  const state = getState();

  return (
    <View className={`py-1 px-3 rounded-full border flex-row items-center ${state.className}`}>
      <Text className="text-xs font-medium">{state.text}</Text>
    </View>
  );
};

export default WatchPartySyncIndicator;

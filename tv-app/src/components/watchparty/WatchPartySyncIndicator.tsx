import React from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, spacing, borderRadius, fontSize } from '../../theme';

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
        bgColor: 'rgba(245, 158, 11, 0.1)',
        textColor: colors.warning,
        borderColor: 'rgba(245, 158, 11, 0.2)',
      };
    }
    if (isSynced) {
      return {
        text: t('watchParty.synced'),
        bgColor: 'rgba(16, 185, 129, 0.1)',
        textColor: colors.success,
        borderColor: 'rgba(16, 185, 129, 0.2)',
      };
    }
    return {
      text: t('watchParty.syncing'),
      bgColor: 'rgba(0, 217, 255, 0.1)',
      textColor: colors.primary,
      borderColor: 'rgba(0, 217, 255, 0.2)',
    };
  };

  const state = getState();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: state.bgColor,
          borderColor: state.borderColor,
        },
      ]}
    >
      <Text style={[styles.text, { color: state.textColor }]}>{state.text}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  text: {
    fontSize: fontSize.xs,
    fontWeight: '500',
  },
});

export default WatchPartySyncIndicator;

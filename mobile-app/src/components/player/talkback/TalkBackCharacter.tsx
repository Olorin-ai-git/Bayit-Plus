/**
 * TalkBackCharacter - Character persona display for TalkBack
 *
 * Shows the AI character avatar, name, and mood indicator
 * for the interactive voice conversation experience.
 */

import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useDirection } from '@bayit/shared-hooks';
import { colors, spacing, borderRadius, fontSize } from '@olorin/design-tokens';
import { Colors } from '../../../theme/colors';

const MOOD_COLOR_MAP: Record<string, string> = {
  happy: Colors.Success.default,
  curious: Colors.Info.default,
  excited: Colors.Warning.default,
  thoughtful: Colors.Primary.p400,
  neutral: Colors.Text.secondary,
};

export interface TalkBackCharacterData {
  name: string;
  avatar: string;
  mood: string;
}

interface TalkBackCharacterProps {
  character: TalkBackCharacterData;
}

export const TalkBackCharacter: React.FC<TalkBackCharacterProps> = ({
  character,
}) => {
  const { t } = useTranslation();
  const { isRTL } = useDirection();

  const moodColor = MOOD_COLOR_MAP[character.mood] || Colors.Text.secondary;

  return (
    <View
      style={[styles.container, isRTL && styles.containerRTL]}
      accessible
      accessibilityRole="text"
      accessibilityLabel={t('talkBack.characterLabel', {
        name: character.name,
        mood: character.mood,
      })}
    >
      <View style={styles.avatarWrapper}>
        <Image
          source={{ uri: character.avatar }}
          style={styles.avatar}
          resizeMode="cover"
          accessibilityIgnoresInvertColors
        />
        <View
          style={[styles.moodDot, { backgroundColor: moodColor }]}
        />
      </View>

      <View style={styles.info}>
        <Text style={styles.name}>{character.name}</Text>
        <View style={[styles.moodRow, isRTL && styles.moodRowRTL]}>
          <View
            style={[styles.moodIndicator, { backgroundColor: moodColor }]}
          />
          <Text style={[styles.moodText, { color: moodColor }]}>
            {t(`talkBack.moods.${character.mood}`)}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  containerRTL: {
    flexDirection: 'row-reverse',
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.full,
    backgroundColor: Colors.Glass.bgMedium,
    borderWidth: 2,
    borderColor: Colors.Glass.border,
  },
  moodDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: Colors.Background.primary,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.text,
  },
  moodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    marginTop: spacing.xxs,
  },
  moodRowRTL: {
    flexDirection: 'row-reverse',
  },
  moodIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  moodText: {
    fontSize: fontSize.xs,
    fontWeight: '500',
  },
});

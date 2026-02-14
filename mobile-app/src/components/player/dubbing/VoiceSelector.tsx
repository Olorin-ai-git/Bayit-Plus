/**
 * VoiceSelector - Voice picker for dubbed audio
 *
 * Grid of available voice options with preview playback capability.
 * Used to select which AI voice to use for dubbing.
 */

import React, { useCallback } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { GlassView } from '@bayit/shared';
import { NativeIcon } from '@olorin/shared-icons/native';
import { spacing, borderRadius } from '@olorin/design-tokens';
import { logger } from '../../../utils/logger';
import Colors from '../../../theme/colors';

const log = logger.scope('VoiceSelector');

interface Voice {
  id: string;
  name: string;
  gender: 'male' | 'female' | 'neutral';
  language: string;
  previewUrl?: string;
}

interface VoiceSelectorProps {
  voices: Voice[];
  selectedVoice: string | null;
  onSelect: (voiceId: string) => void;
}

const GENDER_ICONS: Record<string, string> = {
  male: 'user',
  female: 'user',
  neutral: 'mic',
};

export const VoiceSelector: React.FC<VoiceSelectorProps> = ({
  voices,
  selectedVoice,
  onSelect,
}) => {
  const { t } = useTranslation();

  const handleSelect = useCallback(
    (voiceId: string) => {
      onSelect(voiceId);
      log.info('Voice selected', { voiceId });
    },
    [onSelect],
  );

  return (
    <GlassView intensity="medium" style={styles.container}>
      <Text style={styles.title}>{t('dubbing.voiceSelector.title')}</Text>

      <ScrollView
        contentContainerStyle={styles.grid}
        showsVerticalScrollIndicator={false}
      >
        {voices.map((voice) => {
          const isSelected = selectedVoice === voice.id;
          return (
            <Pressable
              key={voice.id}
              style={[styles.voiceCard, isSelected && styles.voiceCardSelected]}
              onPress={() => handleSelect(voice.id)}
              accessibilityLabel={t('dubbing.voiceSelector.voiceLabel', {
                name: voice.name,
              })}
              accessibilityHint={t('dubbing.voiceSelector.voiceHint', {
                name: voice.name,
              })}
              accessibilityRole="radio"
              accessibilityState={{ selected: isSelected }}
            >
              <View
                style={[
                  styles.avatarCircle,
                  isSelected && styles.avatarCircleSelected,
                ]}
              >
                <NativeIcon
                  name={GENDER_ICONS[voice.gender] || 'mic'}
                  size="md"
                  color={
                    isSelected ? Colors.Primary.p400 : Colors.Text.muted
                  }
                />
              </View>
              <Text
                style={[
                  styles.voiceName,
                  isSelected && styles.voiceNameSelected,
                ]}
                numberOfLines={1}
              >
                {voice.name}
              </Text>
              <Text style={styles.voiceGender}>
                {t(`dubbing.voiceSelector.gender.${voice.gender}`)}
              </Text>
              {voice.previewUrl && (
                <View style={styles.previewBadge}>
                  <NativeIcon
                    name="play"
                    size="xs"
                    color={Colors.Text.muted}
                  />
                </View>
              )}
              {isSelected && (
                <View style={styles.checkBadge}>
                  <NativeIcon
                    name="check"
                    size="xs"
                    color={Colors.Primary.p400}
                  />
                </View>
              )}
            </Pressable>
          );
        })}
      </ScrollView>
    </GlassView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: spacing.md,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.Text.primary,
    marginBottom: spacing.md,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  voiceCard: {
    width: '47%',
    alignItems: 'center',
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: Colors.Glass.borderLight,
    backgroundColor: Colors.Glass.whiteSubtle,
    gap: spacing.xxs,
  },
  voiceCardSelected: {
    borderColor: Colors.Primary.p600,
    backgroundColor: Colors.Glass.purpleLight,
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.Glass.whiteLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xxs,
  },
  avatarCircleSelected: {
    backgroundColor: Colors.Glass.purpleLight,
    borderWidth: 2,
    borderColor: Colors.Primary.p500,
  },
  voiceName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.Text.primary,
    textAlign: 'center',
  },
  voiceNameSelected: {
    color: Colors.Primary.p400,
  },
  voiceGender: {
    fontSize: 11,
    color: Colors.Text.muted,
  },
  previewBadge: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
  },
  checkBadge: {
    position: 'absolute',
    top: spacing.xs,
    left: spacing.xs,
  },
});

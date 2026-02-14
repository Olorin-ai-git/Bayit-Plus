/**
 * SceneTriggerSubviews - Sub-components for scene trigger overlays.
 *
 * Emotion indicator badge and horizontal reaction picker that lets the user
 * select how their avatar should react to an emotional scene moment.
 */
import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { OlorinIcon } from '@olorin/icons/native';
import { Colors } from '../../theme/colors';
import logger from '@/utils/logger';

const subviewLogger = logger.scope('SceneTriggerSubviews');

interface SceneTriggerSubviewsProps {
  emotion: string;
  reactions: string[];
  onReactionSelect: (reaction: string) => void;
}

const EMOTION_ICON_MAP: Record<string, string> = {
  joy: 'face-happy',
  sadness: 'face-sad',
  surprise: 'face-surprised',
  tension: 'face-thoughtful',
  humor: 'face-happy',
  nostalgia: 'heart',
  excitement: 'zap',
};

const EMOTION_COLOR_MAP: Record<string, string> = {
  joy: Colors.Warning.default,
  sadness: Colors.Info.default,
  surprise: Colors.Primary.p400,
  tension: Colors.Error.e400,
  humor: Colors.Success.s400,
  nostalgia: Colors.Primary.p300,
  excitement: Colors.Warning.w400,
};

const EmotionIndicator: React.FC<{ emotion: string }> = ({ emotion }) => {
  const { t } = useTranslation();
  const iconName = EMOTION_ICON_MAP[emotion] || 'circle';
  const badgeColor = EMOTION_COLOR_MAP[emotion] || Colors.Primary.p500;

  return (
    <View style={[styles.emotionBadge, { backgroundColor: `${badgeColor}30` }]}
      accessibilityRole="text"
      accessibilityLabel={t('zehAni.sceneTrigger.emotionDetected', { emotion })}>
      <OlorinIcon name={iconName} size={18} color={badgeColor} />
      <Text style={[styles.emotionText, { color: badgeColor }]}>
        {t(`zehAni.sceneTrigger.emotions.${emotion}`)}
      </Text>
    </View>
  );
};

const ReactionPicker: React.FC<{
  reactions: string[];
  onSelect: (reaction: string) => void;
}> = ({ reactions, onSelect }) => {
  const { t } = useTranslation();

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.reactionScroll}>
      {reactions.map((reaction) => (
        <Pressable key={reaction} style={styles.reactionChip}
          onPress={() => {
            subviewLogger.info('Reaction tapped', { reaction });
            onSelect(reaction);
          }}
          accessibilityLabel={t(`zehAni.sceneTrigger.reactions.${reaction}`)}
          accessibilityHint={t('zehAni.sceneTrigger.selectReactionHint')}
          accessibilityRole="button">
          <Text style={styles.reactionText}>
            {t(`zehAni.sceneTrigger.reactions.${reaction}`)}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
};

export const SceneTriggerSubviews: React.FC<SceneTriggerSubviewsProps> = ({
  emotion,
  reactions,
  onReactionSelect,
}) => {
  return (
    <View style={styles.container}>
      <EmotionIndicator emotion={emotion} />
      {reactions.length > 0 && (
        <ReactionPicker reactions={reactions} onSelect={onReactionSelect} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { gap: 12 },
  emotionBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16,
    alignSelf: 'flex-start',
  },
  emotionText: { fontSize: 14, fontWeight: '600' },
  reactionScroll: { gap: 8, paddingVertical: 4 },
  reactionChip: {
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20,
    backgroundColor: Colors.Glass.whiteSubtle,
    borderWidth: 1, borderColor: Colors.Glass.whiteMedium,
  },
  reactionText: { fontSize: 14, color: Colors.Text.primary, fontWeight: '500' },
});

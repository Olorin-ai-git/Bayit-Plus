/**
 * Video Showcase Card
 * Video thumbnail with play button overlay, triggers WidgetsIntroVideo modal
 */

import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, Animated } from 'react-native';
import { Play } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { colors, spacing, borderRadius } from '@olorin/design-tokens';
import { sanitizeI18n } from '@/utils/security/sanitizeI18n';

interface VideoShowcaseCardProps {
  title: string;
  description: string;
  onPlay: () => void;
}

export const VideoShowcaseCard: React.FC<VideoShowcaseCardProps> = ({
  title,
  description,
  onPlay,
}) => {
  const { t } = useTranslation();
  const [pulseAnim] = useState(new Animated.Value(1));

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  return (
    <View style={styles.container}>
      <Pressable
        style={styles.thumbnailContainer}
        onPress={onPlay}
        accessibilityRole="button"
        accessibilityLabel={t('subscribe.premiumShowcase.a11y.playVideo')}
        accessibilityHint={t('subscribe.premiumShowcase.a11y.playVideoHint')}
      >
        <View style={styles.gradient} />
        <Animated.View
          style={[
            styles.playButtonContainer,
            { transform: [{ scale: pulseAnim }] },
          ]}
        >
          <View style={styles.playButton}>
            <Play size={40} color="#FFFFFF" fill="#FFFFFF" />
          </View>
        </Animated.View>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {sanitizeI18n(t('subscribe.premiumShowcase.badges.aiPowered'))}
          </Text>
        </View>
      </Pressable>
      <View style={styles.textContainer}>
        <Text style={styles.title}>{sanitizeI18n(title)}</Text>
        <Text style={styles.description}>{sanitizeI18n(description)}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minWidth: 300,
  },
  thumbnailContainer: {
    position: 'relative',
    height: 300,
    borderRadius: borderRadius.lg,
    backgroundColor: 'rgba(20, 20, 35, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.primary.DEFAULT,
    opacity: 0.3,
  },
  playButtonContainer: {
    position: 'absolute',
  },
  playButton: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.primary.DEFAULT,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primary.DEFAULT,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
  },
  badge: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    backgroundColor: 'rgba(168, 85, 247, 0.9)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  textContainer: {
    paddingHorizontal: spacing.sm,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: spacing.xs,
  },
  description: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    lineHeight: 20,
  },
});

import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { GlassCard, GlassButton } from '@bayit/shared/ui';
import { colors, spacing } from '@olorin/design-tokens';

interface IntroSectionProps {
  onWatchVideo: () => void;
  onDismiss: () => void;
}

export function IntroSection({ onWatchVideo, onDismiss }: IntroSectionProps) {
  const { t } = useTranslation();

  return (
    <View style={styles.introSection}>
      <GlassCard style={styles.introCard}>
        <View style={styles.introContent}>
          <Text style={styles.introIcon}>🎬</Text>
          <View style={styles.introText}>
            <Text style={styles.introTitle}>
              {t('widgets.intro.title')}
            </Text>
            <Text style={styles.introDescription}>
              {t('widgets.intro.description')}
            </Text>
          </View>
          <GlassButton
            title={t('widgets.intro.watchVideo')}
            onPress={onWatchVideo}
            variant="primary"
            size="md"
          />
          <GlassButton
            title={t('widgets.intro.dismiss')}
            onPress={onDismiss}
            variant="ghost"
            size="sm"
          />
        </View>
      </GlassCard>
    </View>
  );
}

const styles = StyleSheet.create({
  introSection: {
    marginBottom: spacing.lg,
  },
  introCard: {
    padding: spacing.lg,
  },
  introContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flexWrap: 'wrap',
  },
  introIcon: {
    fontSize: 48,
  },
  introText: {
    flex: 1,
    minWidth: 200,
  },
  introTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  introDescription: {
    fontSize: 14,
    color: colors.textSecondary,
  },
});

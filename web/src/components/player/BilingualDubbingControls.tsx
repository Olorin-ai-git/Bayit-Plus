/**
 * BilingualDubbingControls
 * Toggle and status panel for the Bilingual Bridge dubbing feature in the player UI
 */

import { useCallback, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, spacing, borderRadius } from '@olorin/design-tokens';
import { GlassView } from '@bayit/shared/ui';
import { GlassLiveControlButton } from './controls/GlassLiveControlButton';
import { LanguageRatioIndicator } from './LanguageRatioIndicator';
import { useBilingualDubbingStore } from '@/stores/bilingualDubbingStore';
import logger from '@/utils/logger';

const controlsLogger = logger.scope('BilingualDubbingControls');

interface BilingualDubbingControlsProps {
  contentId: string;
  profileId: string;
  onHoveredButtonChange?: (button: string | null) => void;
}

export default function BilingualDubbingControls({
  contentId,
  profileId,
  onHoveredButtonChange,
}: BilingualDubbingControlsProps) {
  const { t } = useTranslation();
  const {
    proficiency,
    activeSession,
    isActive,
    loading,
    fetchProficiency,
    startSession,
    endSession,
  } = useBilingualDubbingStore();

  useEffect(() => {
    if (profileId) {
      fetchProficiency(profileId);
    }
  }, [profileId, fetchProficiency]);

  const handleToggle = useCallback(() => {
    if (loading) return;
    if (isActive) {
      endSession();
      controlsLogger.info('Bilingual dubbing toggled off', {});
    } else {
      startSession(contentId, profileId);
      controlsLogger.info('Bilingual dubbing toggled on', {});
    }
  }, [isActive, loading, contentId, profileId, startSession, endSession]);

  const levelLabel = proficiency?.level
    ? t(`bilingual.level.${proficiency.level}`, proficiency.level)
    : t('bilingual.level.unknown');

  return (
    <View style={styles.container}>
      <View
        onMouseEnter={() => onHoveredButtonChange?.('bilingualDubbing')}
        onMouseLeave={() => onHoveredButtonChange?.(null)}
      >
        <GlassLiveControlButton
          icon={
            <Text style={styles.iconText}>
              {isActive ? '\u05E2\u05D1' : '\u05E2'}
            </Text>
          }
          label={t('bilingual.title', 'Bilingual Bridge')}
          isEnabled={isActive}
          isConnecting={loading}
          isPremium
          onPress={handleToggle}
          tooltip={
            isActive
              ? t('bilingual.active', 'Bilingual Bridge Active')
              : t('bilingual.clickToEnable', 'Enable Hebrew engagement')
          }
        />
      </View>

      {proficiency && (
        <GlassView style={styles.statusPanel} intensity="medium">
          <View style={styles.levelBadge}>
            <Text style={styles.levelText}>{levelLabel}</Text>
          </View>

          <LanguageRatioIndicator
            hebrewRatio={activeSession?.actual_hebrew_ratio ?? proficiency.hebrew_ratio}
            compact
          />

          <View style={styles.vocabIndicator}>
            <Text style={styles.vocabCount}>
              {proficiency.total_words_learned}
            </Text>
            <Text style={styles.vocabLabel}>
              {t('bilingual.wordsLearned', 'words')}
            </Text>
          </View>

          {isActive && activeSession && (
            <View style={styles.sessionStatus}>
              <View style={styles.activeDot} />
              <Text style={styles.sessionText}>
                {t('bilingual.sessionActive', 'Session active')}
              </Text>
            </View>
          )}
        </GlassView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  statusPanel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.lg,
  },
  levelBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(139, 92, 246, 0.3)',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.5)',
  },
  levelText: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  vocabIndicator: {
    alignItems: 'center',
  },
  vocabCount: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  vocabLabel: {
    color: colors.textSecondary,
    fontSize: 10,
  },
  sessionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  sessionText: {
    color: '#10B981',
    fontSize: 11,
    fontWeight: '600',
  },
});

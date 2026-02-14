/**
 * LevelProgress - Visual level progress bar with animated fill
 *
 * Features:
 * - Animated progress bar fill
 * - Current level and next level display
 * - XP counter
 * - RTL support, accessibility
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useDirection } from '@bayit/shared-hooks';
import { NativeIcon } from '@olorin/shared-icons/native';
import { spacing, borderRadius, fontSize } from '@olorin/design-tokens';
import { Colors } from '../../theme/colors';

interface LevelProgressProps {
  currentXP: number;
  nextLevelXP: number;
  level: number;
  levelName: string;
}

const ANIMATION_DURATION_MS = 800;

export const LevelProgress: React.FC<LevelProgressProps> = ({
  currentXP,
  nextLevelXP,
  level,
  levelName,
}) => {
  const { t } = useTranslation();
  const { isRTL, textAlign } = useDirection();
  const fillWidth = useRef(new Animated.Value(0)).current;

  const progressPercent = nextLevelXP > 0
    ? Math.min((currentXP / nextLevelXP) * 100, 100)
    : 100;

  useEffect(() => {
    Animated.timing(fillWidth, {
      toValue: progressPercent,
      duration: ANIMATION_DURATION_MS,
      useNativeDriver: false,
    }).start();
  }, [progressPercent, fillWidth]);

  const xpRemaining = Math.max(nextLevelXP - currentXP, 0);

  return (
    <View
      style={styles.container}
      accessibilityRole="progressbar"
      accessibilityLabel={t('rewards.level.progressLabel', {
        level,
        name: levelName,
        current: currentXP,
        next: nextLevelXP,
      })}
      accessibilityValue={{
        min: 0,
        max: nextLevelXP,
        now: currentXP,
      }}
    >
      <View style={[styles.header, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <View style={[styles.levelBadge, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <NativeIcon name="shield" size="sm" color={Colors.Special.gold} />
          <Text style={styles.levelNumber}>{level}</Text>
        </View>

        <View style={styles.levelInfo}>
          <Text style={[styles.levelName, { textAlign }]}>{levelName}</Text>
          <Text style={[styles.xpText, { textAlign }]}>
            {nextLevelXP > 0
              ? t('rewards.level.xpProgress', {
                  current: currentXP.toLocaleString(),
                  next: nextLevelXP.toLocaleString(),
                })
              : t('rewards.level.maxLevel')}
          </Text>
        </View>

        {nextLevelXP > 0 && (
          <View style={styles.nextLevelBadge}>
            <Text style={styles.nextLevelText}>{level + 1}</Text>
          </View>
        )}
      </View>

      <View style={styles.progressBarBg}>
        <Animated.View
          style={[
            styles.progressBarFill,
            {
              width: fillWidth.interpolate({
                inputRange: [0, 100],
                outputRange: ['0%', '100%'],
              }),
            },
          ]}
        />
      </View>

      {nextLevelXP > 0 && (
        <Text style={[styles.remainingText, { textAlign }]}>
          {t('rewards.level.xpRemaining', { xp: xpRemaining.toLocaleString() })}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.Glass.whiteMedium,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    marginTop: spacing[3],
    borderWidth: 1,
    borderColor: Colors.Glass.borderLight,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing[3],
    gap: spacing[3],
  },
  levelBadge: {
    alignItems: 'center',
    gap: spacing[1],
    backgroundColor: Colors.Glass.purpleStrong,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1.5],
  },
  levelNumber: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: Colors.Special.gold,
  },
  levelInfo: {
    flex: 1,
  },
  levelName: {
    fontSize: fontSize.base,
    fontWeight: '600',
    color: Colors.Text.primary,
  },
  xpText: {
    fontSize: fontSize.xs,
    color: Colors.Text.muted,
    marginTop: spacing[0.5],
  },
  nextLevelBadge: {
    width: spacing[8],
    height: spacing[8],
    borderRadius: borderRadius.full,
    backgroundColor: Colors.Glass.whiteSubtle,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.Glass.borderLight,
  },
  nextLevelText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: Colors.Text.muted,
  },
  progressBarBg: {
    height: spacing[2],
    backgroundColor: Colors.Glass.whiteStrong,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: Colors.Primary.default,
    borderRadius: borderRadius.full,
  },
  remainingText: {
    fontSize: fontSize.xs,
    color: Colors.Text.muted,
    marginTop: spacing[1.5],
  },
});

export default LevelProgress;

import React from 'react';
import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { styles } from './LevelProgressBar.styles';

interface LevelProgressBarProps {
  currentXp: number;
  xpToNextLevel: number;
  level: number;
  title: string;
}

export function LevelProgressBar({
  currentXp,
  xpToNextLevel,
  level,
  title,
}: LevelProgressBarProps) {
  const { t } = useTranslation();

  const progress = xpToNextLevel > 0 ? (currentXp / xpToNextLevel) * 100 : 100;
  const progressPercent = Math.min(Math.max(progress, 0), 100);

  return (
    <View style={styles.container}>
      <View style={styles.barContainer}>
        <View style={[styles.barFill, { width: `${progressPercent}%` }]} />
      </View>
      <Text style={styles.xpText}>
        {xpToNextLevel > 0
          ? t('gamification.xpProgress', {
              current: currentXp.toLocaleString(),
              next: xpToNextLevel.toLocaleString(),
            })
          : t('gamification.maxLevel')}
      </Text>
    </View>
  );
}

export default LevelProgressBar;

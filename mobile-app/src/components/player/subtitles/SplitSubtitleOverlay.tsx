/**
 * SplitSubtitleOverlay - Bilingual subtitle display
 *
 * Renders two subtitle panes simultaneously: primary language on top,
 * secondary language on bottom. Used for split/bilingual subtitle mode.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SubtitlePane } from './SubtitlePane';
import { spacing } from '@olorin/design-tokens';

interface SplitSubtitleOverlayProps {
  primaryText: string;
  secondaryText: string;
  primaryLanguage: string;
  secondaryLanguage: string;
}

export const SplitSubtitleOverlay: React.FC<SplitSubtitleOverlayProps> = ({
  primaryText,
  secondaryText,
  primaryLanguage,
  secondaryLanguage,
}) => {
  const { t } = useTranslation();

  if (!primaryText && !secondaryText) return null;

  return (
    <View
      style={styles.container}
      pointerEvents="none"
      accessibilityLabel={t('subtitles.splitOverlay.label')}
      accessibilityRole="text"
    >
      {primaryText ? (
        <SubtitlePane
          text={primaryText}
          language={primaryLanguage}
          position="top"
        />
      ) : null}
      {secondaryText ? (
        <SubtitlePane
          text={secondaryText}
          language={secondaryLanguage}
          position="bottom"
        />
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
    paddingVertical: spacing.xxl,
  },
});

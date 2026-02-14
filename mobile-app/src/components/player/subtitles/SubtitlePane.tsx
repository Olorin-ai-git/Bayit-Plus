/**
 * SubtitlePane - Single subtitle text pane
 *
 * Renders a single subtitle line with configurable language,
 * font size, and vertical position. Reused by split subtitle views.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { spacing, borderRadius } from '@olorin/design-tokens';
import Colors from '../../../theme/colors';

type SubtitlePosition = 'top' | 'bottom';

interface SubtitlePaneProps {
  text: string;
  language: string;
  fontSize?: number;
  position: SubtitlePosition;
}

const DEFAULT_FONT_SIZE = 16;
const RTL_LANGUAGES = ['he', 'ar', 'fa', 'ur'];

export const SubtitlePane: React.FC<SubtitlePaneProps> = ({
  text,
  language,
  fontSize = DEFAULT_FONT_SIZE,
  position,
}) => {
  const { t } = useTranslation();
  const isRTL = RTL_LANGUAGES.includes(language);

  if (!text) return null;

  return (
    <View
      style={[
        styles.container,
        position === 'top' ? styles.positionTop : styles.positionBottom,
      ]}
      accessibilityLabel={t('subtitles.pane.label', { language })}
      accessibilityRole="text"
    >
      <View style={styles.background}>
        <Text
          style={[
            styles.text,
            { fontSize },
            isRTL && styles.rtlText,
          ]}
          numberOfLines={3}
        >
          {text}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    alignItems: 'center',
  },
  positionTop: {
    top: spacing.xl,
  },
  positionBottom: {
    bottom: spacing.xl,
  },
  background: {
    backgroundColor: Colors.Glass.bgStrong,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    maxWidth: '90%',
  },
  text: {
    color: Colors.Text.primary,
    textAlign: 'center',
    lineHeight: 24,
    fontWeight: '500',
  },
  rtlText: {
    writingDirection: 'rtl',
    textAlign: 'right',
  },
});

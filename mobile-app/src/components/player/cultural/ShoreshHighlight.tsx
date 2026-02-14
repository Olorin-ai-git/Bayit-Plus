/**
 * ShoreshHighlight - Hebrew root (shoresh) display with color highlighting
 *
 * Shows root letters in larger font with breakdown of how the root
 * connects to the derived word and its meaning.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useDirection } from '@bayit/shared-hooks';
import { colors, spacing, borderRadius, fontSize } from '@olorin/design-tokens';
import { Colors } from '../../../theme/colors';

interface ShoreshHighlightProps {
  root: string;
  derivedWord: string;
  meaning: string;
}

export const ShoreshHighlight: React.FC<ShoreshHighlightProps> = ({
  root,
  derivedWord,
  meaning,
}) => {
  const { t } = useTranslation();
  const { textAlign } = useDirection();

  const rootLetters = [...root];

  return (
    <View
      style={styles.container}
      accessible
      accessibilityRole="text"
      accessibilityLabel={t('cultural.shoreshAccessibility', {
        root,
        derivedWord,
        meaning,
      })}
    >
      <View style={styles.rootDisplay}>
        <View style={styles.lettersRow}>
          {rootLetters.map((letter, index) => (
            <View key={`${letter}-${index}`} style={styles.letterBox}>
              <Text style={styles.letter}>{letter}</Text>
            </View>
          ))}
        </View>
        <Text style={styles.rootLabel}>
          {t('cultural.rootLetters')}
        </Text>
      </View>

      <View style={styles.connectionLine} />

      <View style={styles.derivationRow}>
        <View style={styles.derivationItem}>
          <Text style={[styles.derivationLabel, { textAlign }]}>
            {t('cultural.derivedWord')}
          </Text>
          <Text style={[styles.derivedWordText, { textAlign }]}>
            {derivedWord}
          </Text>
        </View>

        <View style={styles.arrowContainer}>
          <Text style={styles.arrow}>{'\u2192'}</Text>
        </View>

        <View style={styles.derivationItem}>
          <Text style={[styles.derivationLabel, { textAlign }]}>
            {t('cultural.meaning')}
          </Text>
          <Text style={[styles.meaningText, { textAlign }]}>
            {meaning}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.Glass.whiteSubtle,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
  },
  rootDisplay: {
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  lettersRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  letterBox: {
    width: 52,
    height: 52,
    borderRadius: borderRadius.md,
    backgroundColor: Colors.Glass.purpleLight,
    borderWidth: 1,
    borderColor: Colors.Primary.p500,
    justifyContent: 'center',
    alignItems: 'center',
  },
  letter: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.Primary.p300,
  },
  rootLabel: {
    fontSize: fontSize.xs,
    fontWeight: '500',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  connectionLine: {
    width: 1,
    height: 16,
    backgroundColor: Colors.Glass.border,
    marginVertical: spacing.xxs,
  },
  derivationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  derivationItem: {
    flex: 1,
    alignItems: 'center',
  },
  derivationLabel: {
    fontSize: fontSize.xs,
    fontWeight: '500',
    color: colors.textSecondary,
    marginBottom: spacing.xxs,
  },
  derivedWordText: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text,
  },
  arrowContainer: {
    paddingHorizontal: spacing.xs,
  },
  arrow: {
    fontSize: fontSize.lg,
    color: Colors.Primary.p400,
  },
  meaningText: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    color: Colors.Primary.p300,
  },
});

import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors, spacing, borderRadius, fontSize, glass } from '@olorin/design-tokens';

interface TranslationPopupProps {
  word: string;
  translation: string;
  transliteration: string;
  example?: string;
  onClose: () => void;
  position: { x: number; y: number };
}

export const TranslationPopup: React.FC<TranslationPopupProps> = ({
  word,
  translation,
  transliteration,
  example,
  onClose,
  position
}) => {
  return (
    <>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View
        style={[
          styles.popup,
          {
            left: position.x,
            top: position.y
          }
        ]}
      >
        <View style={styles.header}>
          <Text style={styles.word}>{word}</Text>
          <Pressable onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeText}>×</Text>
          </Pressable>
        </View>

        <View style={styles.arrow}>
          <Text style={styles.arrowText}>→</Text>
        </View>

        <Text style={styles.translation}>{translation}</Text>

        {transliteration && (
          <Text style={styles.transliteration}>{transliteration}</Text>
        )}

        {example && (
          <View style={styles.exampleContainer}>
            <Text style={styles.exampleLabel}>Example:</Text>
            <Text style={styles.exampleText}>{example}</Text>
          </View>
        )}
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: glass.overlay.dark
  },
  popup: {
    position: 'absolute',
    minWidth: 280,
    maxWidth: 400,
    backgroundColor: glass.surface.dark,
    backdropFilter: glass.blur.lg,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.neutral[700],
    shadowColor: colors.neutral[900],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    zIndex: 1000
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm
  },
  word: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.neutral[50]
  },
  closeButton: {
    padding: spacing.xs,
    borderRadius: borderRadius.sm
  },
  closeText: {
    fontSize: fontSize['2xl'],
    color: colors.neutral[400],
    lineHeight: fontSize['2xl']
  },
  arrow: {
    marginBottom: spacing.sm
  },
  arrowText: {
    fontSize: fontSize.lg,
    color: colors.primary[400]
  },
  translation: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.primary[300],
    marginBottom: spacing.sm
  },
  transliteration: {
    fontSize: fontSize.md,
    color: colors.neutral[400],
    fontStyle: 'italic',
    marginBottom: spacing.md
  },
  exampleContainer: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.neutral[700]
  },
  exampleLabel: {
    fontSize: fontSize.sm,
    color: colors.neutral[500],
    fontWeight: '600',
    marginBottom: spacing.xs
  },
  exampleText: {
    fontSize: fontSize.md,
    color: colors.neutral[300],
    lineHeight: fontSize.lg
  }
});

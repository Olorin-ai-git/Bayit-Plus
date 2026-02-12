import React, { useEffect, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, Animated } from 'react-native';
import { colors, spacing, fontSize, borderRadius, glass } from '@olorin/design-tokens';

interface PhraseBreakdownCardProps {
  phrase: string;
  transliteration: string;
  literalTranslation: string;
  meaning: string;
  origin: string;
  usageLevel: string;
  funFact?: string;
  tags: string[];
  onClose: () => void;
}

const PhraseBreakdownCard: React.FC<PhraseBreakdownCardProps> = ({
  phrase,
  transliteration,
  literalTranslation,
  meaning,
  origin,
  usageLevel,
  funFact,
  tags,
  onClose,
}) => {
  const slideAnim = useRef(new Animated.Value(1000)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 50,
        friction: 8,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, [slideAnim, fadeAnim]);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 1000,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  };

  return (
    <View style={styles.overlay}>
      <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]}>
        <Pressable style={styles.backdropPressable} onPress={handleClose} />
      </Animated.View>

      <Animated.View
        style={[
          styles.card,
          { transform: [{ translateY: slideAnim }] },
        ]}
      >
        <Pressable style={styles.closeButton} onPress={handleClose}>
          <Text style={styles.closeButtonText}>Close</Text>
        </Pressable>

        <View style={styles.header}>
          <Text style={styles.phrase}>{phrase}</Text>
          <Text style={styles.transliteration}>{transliteration}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Literal</Text>
          <Text style={styles.sectionContent}>{literalTranslation}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Meaning</Text>
          <Text style={styles.sectionContent}>{meaning}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Origin</Text>
          <Text style={styles.sectionContent}>{origin}</Text>
        </View>

        {funFact && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Fun Fact</Text>
            <Text style={styles.sectionContent}>{funFact}</Text>
          </View>
        )}

        <View style={styles.tagsContainer}>
          {tags.map((tag, index) => (
            <View key={`${tag}-${index}`} style={styles.tag}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
        </View>

        <View style={styles.usageLevel}>
          <Text style={styles.usageLevelText}>Usage: {usageLevel}</Text>
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.background.overlay,
  },
  backdropPressable: {
    width: '100%',
    height: '100%',
  },
  card: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: '90%',
    backgroundColor: glass.background,
    backdropFilter: glass.backdropFilter,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.xl,
    shadowColor: colors.textPrimary,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  closeButton: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    padding: spacing.sm,
    zIndex: 10,
  },
  closeButtonText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  header: {
    marginBottom: spacing.lg,
    alignItems: 'center',
  },
  phrase: {
    fontSize: fontSize['2xl'],
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  transliteration: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionContent: {
    fontSize: fontSize.base,
    color: colors.textPrimary,
    lineHeight: 24,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  tag: {
    backgroundColor: colors.background.tertiary,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  tagText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  usageLevel: {
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  usageLevelText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});

export default PhraseBreakdownCard;

import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors, spacing, borderRadius, fontSize, glass } from '@olorin/design-tokens';

interface InteractiveWordProps {
  word: string;
  index: number;
  isHighlighted: boolean;
  isRTL: boolean;
  onWordTap: (word: string, index: number) => void;
}

export const InteractiveWord: React.FC<InteractiveWordProps> = ({
  word,
  index,
  isHighlighted,
  isRTL,
  onWordTap
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);

  const handlePress = () => {
    onWordTap(word, index);
  };

  return (
    <Pressable
      onPress={handlePress}
      onPressIn={() => setIsPressed(true)}
      onPressOut={() => setIsPressed(false)}
      onHoverIn={() => setIsHovered(true)}
      onHoverOut={() => setIsHovered(false)}
      style={[
        styles.wordButton,
        isHighlighted && styles.highlighted,
        (isHovered || isPressed) && styles.hovered
      ]}
    >
      <Text
        style={[
          styles.wordText,
          isRTL && styles.rtlText,
          isHighlighted && styles.highlightedText
        ]}
      >
        {word}
      </Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  wordButton: {
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xxs,
    marginHorizontal: spacing.xxs,
    borderRadius: borderRadius.sm,
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: 'transparent',
    transition: 'all 0.2s ease'
  },
  hovered: {
    backgroundColor: glass.overlay.light,
    backdropFilter: glass.blur.md
  },
  highlighted: {
    borderColor: colors.primary[500],
    backgroundColor: glass.overlay.medium
  },
  wordText: {
    fontSize: fontSize.lg,
    color: colors.neutral[50],
    fontWeight: '600',
    textShadowColor: colors.neutral[900],
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4
  },
  rtlText: {
    direction: 'rtl'
  },
  highlightedText: {
    color: colors.primary[300]
  }
});

/**
 * Speech Bubble Component
 * Displays the wizard's spoken text near the wizard/hat
 * Supports text chunking for mobile with pagination dots
 */

import React from 'react';
import { View, Text, Animated, Platform } from 'react-native';
import { colors, spacing } from '@olorin/design-tokens';
import { isTV } from '../../utils/platform';

interface SpeechBubbleProps {
  displayText: string;
  bubbleAnim: Animated.Value;
  isRTL: boolean;
  isMobile: boolean;
  bottomOffset: number;
  rightOffset: number;
  /** Text chunks for mobile pagination */
  textChunks?: string[];
  /** Current chunk index for mobile pagination */
  currentChunkIndex?: number;
}

export const SpeechBubble: React.FC<SpeechBubbleProps> = ({
  displayText,
  bubbleAnim,
  isRTL,
  isMobile,
  bottomOffset,
  rightOffset,
  textChunks = [],
  currentChunkIndex = 0,
}) => {
  const maxWidth = isMobile ? 200 : isTV ? 320 : 240;
  const minWidth = isMobile ? 80 : isTV ? 120 : 100;
  const borderRadiusValue = isMobile ? 16 : 24;
  const fontSize = isMobile ? 13 : isTV ? 16 : 14;
  const lineHeight = isMobile ? 18 : isTV ? 22 : 20;

  return (
    <Animated.View
      style={{
        position: 'fixed',
        [isRTL ? 'left' : 'right']: rightOffset,
        bottom: bottomOffset,
        maxWidth,
        minWidth,
        opacity: bubbleAnim,
        transform: [
          { scale: bubbleAnim },
          {
            translateX: bubbleAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [isRTL ? -20 : 20, 0],
            }),
          },
        ],
        backgroundColor: 'rgba(13,13,26,0.95)',
        borderRadius: borderRadiusValue,
        borderWidth: 2,
        borderColor: 'rgba(139,92,246,0.4)',
        paddingHorizontal: isMobile ? spacing.sm : spacing.md,
        paddingVertical: isMobile ? spacing.xs : spacing.sm,
        shadowColor: '#8b5cf6',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 8,
        ...(Platform.OS === 'web' ? {
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
        } : {}),
      }}
    >
      {/* Speech bubble tail/pointer */}
      <View
        style={{
          position: 'absolute',
          [isRTL ? 'left' : 'right']: -10,
          top: '50%',
          marginTop: -8,
          width: 0,
          height: 0,
          borderTopWidth: 8,
          borderBottomWidth: 8,
          borderTopColor: 'transparent',
          borderBottomColor: 'transparent',
          [isRTL ? 'borderRightWidth' : 'borderLeftWidth']: 10,
          [isRTL ? 'borderRightColor' : 'borderLeftColor']: 'rgba(139,92,246,0.4)',
        }}
      />
      <Text
        style={{
          color: colors.textPrimary,
          fontSize,
          lineHeight,
          textAlign: isRTL ? 'right' : 'left',
          fontWeight: '500',
        }}
        numberOfLines={4}
      >
        {displayText}
      </Text>

      {/* Chunk pagination indicator for mobile */}
      {isMobile && textChunks.length > 1 && (
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
            marginTop: spacing.xs,
            gap: 4,
          }}
        >
          {textChunks.map((_, index) => (
            <View
              key={index}
              style={{
                width: 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: index === currentChunkIndex
                  ? 'rgba(139,92,246,0.9)'
                  : 'rgba(139,92,246,0.3)',
              }}
            />
          ))}
        </View>
      )}
    </Animated.View>
  );
};

export default SpeechBubble;

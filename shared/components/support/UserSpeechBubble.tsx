/**
 * User Speech Bubble Component
 * Displays what the user is saying (transcript) during voice listening
 */

import React from 'react';
import { View, Text, Animated, Platform } from 'react-native';
import { colors, spacing } from '@olorin/design-tokens';
import { NativeIcon } from '@olorin/shared-icons/native';
import { isTV } from '../../utils/platform';

interface UserSpeechBubbleProps {
  transcript: string;
  userBubbleAnim: Animated.Value;
  isRTL: boolean;
  isMobile: boolean;
  bottomOffset: number;
  rightOffset: number;
}

export const UserSpeechBubble: React.FC<UserSpeechBubbleProps> = ({
  transcript,
  userBubbleAnim,
  isRTL,
  isMobile,
  bottomOffset,
  rightOffset,
}) => {
  const maxWidth = isMobile ? 200 : isTV ? 320 : 240;
  const minWidth = isMobile ? 80 : isTV ? 120 : 100;
  const borderRadiusValue = isMobile ? 16 : 24;
  const fontSize = isMobile ? 12 : isTV ? 15 : 13;
  const lineHeight = isMobile ? 16 : isTV ? 20 : 18;

  return (
    <Animated.View
      style={{
        position: 'fixed',
        [isRTL ? 'left' : 'right']: rightOffset,
        bottom: bottomOffset,
        maxWidth,
        minWidth,
        opacity: userBubbleAnim,
        transform: [
          { scale: userBubbleAnim },
          {
            translateX: userBubbleAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [isRTL ? -20 : 20, 0],
            }),
          },
        ],
        backgroundColor: 'rgba(59,130,246,0.15)',
        borderRadius: borderRadiusValue,
        borderWidth: 2,
        borderColor: 'rgba(59,130,246,0.5)',
        paddingHorizontal: isMobile ? spacing.sm : spacing.md,
        paddingVertical: isMobile ? spacing.xs : spacing.sm,
        shadowColor: '#3b82f6',
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
      {/* User bubble tail/pointer pointing down to hat */}
      <View
        style={{
          position: 'absolute',
          [isRTL ? 'left' : 'right']: 20,
          bottom: -10,
          width: 0,
          height: 0,
          borderLeftWidth: 8,
          borderRightWidth: 8,
          borderTopWidth: 10,
          borderLeftColor: 'transparent',
          borderRightColor: 'transparent',
          borderTopColor: 'rgba(59,130,246,0.5)',
        }}
      />
      {/* Microphone icon to indicate user input */}
      <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: spacing.xs }}>
        <NativeIcon
          name="mic"
          size="sm"
          color="rgba(59,130,246,0.8)"
        />
        <Text
          style={{
            color: colors.textPrimary,
            fontSize,
            lineHeight,
            textAlign: isRTL ? 'right' : 'left',
            fontWeight: '400',
            fontStyle: 'italic',
            flex: 1,
          }}
          numberOfLines={isMobile ? 2 : 3}
        >
          {transcript}
        </Text>
      </View>
    </Animated.View>
  );
};

export default UserSpeechBubble;

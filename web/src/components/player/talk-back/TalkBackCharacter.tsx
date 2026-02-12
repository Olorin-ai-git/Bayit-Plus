/**
 * TalkBackCharacter Component
 * Animated character that asks Hebrew engagement questions during playback.
 * Displays character name, avatar initial with speaking pulse, and question bubble.
 */

import React, { useEffect, useRef } from 'react';
import { Animated, View, Text, Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import { talkBackStyles as styles, getTvStyles } from './talkBackStyles';

interface TalkBackCharacterProps {
  characterName: string;
  questionText: string;
  isSpeaking: boolean;
  isRTL?: boolean;
}

const useNativeDriver = Platform.OS !== 'web';

export function TalkBackCharacter({
  characterName,
  questionText,
  isSpeaking,
  isRTL = false,
}: TalkBackCharacterProps) {
  const { i18n } = useTranslation();
  const isTV = Platform.isTV || Platform.OS === 'tvos';
  const tvStyles = getTvStyles(isTV);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const isHebrew = i18n.language === 'he' || isRTL;

  useEffect(() => {
    if (isSpeaking) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.12,
            duration: 600,
            useNativeDriver,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }

    pulseAnim.setValue(1);
    return () => {
      pulseAnim.stopAnimation();
    };
  }, [isSpeaking, pulseAnim]);

  return (
    <View>
      <View
        style={[
          styles.characterRow,
          isHebrew && styles.characterRowRTL,
        ]}
        accessible={true}
        accessibilityRole="header"
        accessibilityLabel={characterName}
      >
        <Animated.View
          style={[
            styles.characterAvatar,
            isTV && styles.characterAvatarTV,
            { transform: [{ scale: pulseAnim }] },
          ]}
        >
          <Text style={{ color: '#C084FC', fontSize: isTV ? 28 : 20, fontWeight: '700' }}>
            {characterName.charAt(0)}
          </Text>
        </Animated.View>

        <Text style={[styles.characterName, tvStyles.characterName]}>
          {characterName}
        </Text>
      </View>

      <View style={styles.questionBubble}>
        <Text
          style={[
            styles.questionText,
            isHebrew && styles.questionTextRTL,
            tvStyles.questionText,
          ]}
          accessible={true}
          accessibilityRole="text"
        >
          {questionText}
        </Text>
      </View>
    </View>
  );
}

export default TalkBackCharacter;

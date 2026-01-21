import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  ScrollView,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { GlassView } from '../ui/GlassView';
import { GlassInput } from '../ui/GlassInput';
import { GlassButton } from '../ui/GlassButton';
import { colors, spacing, borderRadius, fontSize, shadows } from '../../theme';
import { isTV } from '../../utils/platform';

const QUICK_EMOJIS = ['👍', '❤️', '😂', '😮', '👏', '🔥'];

interface WatchPartyChatInputProps {
  onSend: (message: string, type?: string) => void;
  disabled?: boolean;
}

export const WatchPartyChatInput: React.FC<WatchPartyChatInputProps> = ({
  onSend,
  disabled,
}) => {
  const { t } = useTranslation();
  const [message, setMessage] = useState('');
  const [showEmojis, setShowEmojis] = useState(false);
  const [focusedEmoji, setFocusedEmoji] = useState(-1);
  const scaleAnims = useRef(QUICK_EMOJIS.map(() => new Animated.Value(1))).current;

  const handleSend = () => {
    const trimmed = message.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setMessage('');
  };

  const handleEmojiPress = (emoji: string) => {
    onSend(emoji, 'emoji');
    setShowEmojis(false);
  };

  const handleEmojiFocus = (index: number) => {
    setFocusedEmoji(index);
    if (isTV) {
      Animated.spring(scaleAnims[index], {
        toValue: 1.3,
        friction: 5,
        useNativeDriver: true,
      }).start();
    }
  };

  const handleEmojiBlur = (index: number) => {
    setFocusedEmoji(-1);
    if (isTV) {
      Animated.spring(scaleAnims[index], {
        toValue: 1,
        friction: 5,
        useNativeDriver: true,
      }).start();
    }
  };

  if (isTV) {
    return (
      <View style={styles.tvContainer}>
        <Text style={styles.quickReactLabel}>{t('watchParty.sendMessage')}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.emojiRow}>
            {QUICK_EMOJIS.map((emoji, index) => (
              <TouchableOpacity
                key={emoji}
                onPress={() => handleEmojiPress(emoji)}
                onFocus={() => handleEmojiFocus(index)}
                onBlur={() => handleEmojiBlur(index)}
                disabled={disabled}
              >
                <Animated.View
                  style={[
                    styles.emojiButton,
                    focusedEmoji === index && shadows.glow(colors.primary),
                    { transform: [{ scale: scaleAnims[index] }] },
                  ]}
                >
                  <GlassView
                    style={styles.emojiInner}
                    intensity="medium"
                    borderColor={focusedEmoji === index ? colors.primary : undefined}
                  >
                    <Text style={styles.emoji}>{emoji}</Text>
                  </GlassView>
                </Animated.View>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {showEmojis && (
        <GlassView style={styles.emojiPicker} intensity="high">
          <View style={styles.emojiGrid}>
            {QUICK_EMOJIS.map((emoji) => (
              <TouchableOpacity
                key={emoji}
                onPress={() => handleEmojiPress(emoji)}
                style={styles.emojiPickerButton}
              >
                <Text style={styles.emoji}>{emoji}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </GlassView>
      )}

      <View style={styles.inputRow}>
        <TouchableOpacity
          onPress={() => setShowEmojis(!showEmojis)}
          style={[styles.emojiToggle, showEmojis && styles.emojiToggleActive]}
        >
          <Text style={styles.emojiToggleIcon}>😊</Text>
        </TouchableOpacity>

        <View style={styles.inputWrapper}>
          <GlassInput
            value={message}
            onChangeText={setMessage}
            placeholder={t('watchParty.typeMessage')}
            editable={!disabled}
            onSubmitEditing={handleSend}
            returnKeyType="send"
          />
        </View>

        <GlassButton
          title="➤"
          onPress={handleSend}
          variant="primary"
          size="sm"
          disabled={!message.trim() || disabled}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  tvContainer: {
    gap: spacing.sm,
  },
  quickReactLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    paddingHorizontal: spacing.xs,
  },
  emojiRow: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  emojiButton: {
    borderRadius: borderRadius.md,
  },
  emojiInner: {
    padding: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 24,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  emojiToggle: {
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.glassBorder,
  },
  emojiToggleActive: {
    backgroundColor: colors.primary + '30',
  },
  emojiToggleIcon: {
    fontSize: 20,
  },
  inputWrapper: {
    flex: 1,
  },
  emojiPicker: {
    position: 'absolute',
    bottom: '100%',
    left: 0,
    marginBottom: spacing.sm,
    padding: spacing.sm,
    zIndex: 10,
  },
  emojiGrid: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  emojiPickerButton: {
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
  },
});

export default WatchPartyChatInput;

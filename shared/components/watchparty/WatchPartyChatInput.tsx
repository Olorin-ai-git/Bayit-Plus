import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  ScrollView,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { GlassView } from '../ui/GlassView';
import { GlassInput } from '../ui/GlassInput';
import { GlassButton } from '../ui/GlassButton';
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
      <View className="gap-3">
        <Text className="text-sm text-white/70 px-1">{t('watchParty.sendMessage')}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View className="flex-row gap-4 py-3">
            {QUICK_EMOJIS.map((emoji, index) => (
              <TouchableOpacity
                key={emoji}
                onPress={() => handleEmojiPress(emoji)}
                onFocus={() => handleEmojiFocus(index)}
                onBlur={() => handleEmojiBlur(index)}
                disabled={disabled}
              >
                <Animated.View
                  className={`rounded-lg ${focusedEmoji === index ? 'shadow-lg shadow-purple-500/50' : ''}`}
                  style={{ transform: [{ scale: scaleAnims[index] }] }}
                >
                  <GlassView
                    className="p-4 items-center justify-center"
                    intensity="medium"
                    borderColor={focusedEmoji === index ? '#9333ea' : undefined}
                  >
                    <Text className="text-2xl">{emoji}</Text>
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
    <View className="gap-3">
      {showEmojis && (
        <GlassView className="absolute bottom-full left-0 mb-3 p-3 z-10" intensity="high">
          <View className="flex-row gap-1">
            {QUICK_EMOJIS.map((emoji) => (
              <TouchableOpacity
                key={emoji}
                onPress={() => handleEmojiPress(emoji)}
                className="p-3 rounded"
              >
                <Text className="text-2xl">{emoji}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </GlassView>
      )}

      <View className="flex-row items-center gap-3">
        <TouchableOpacity
          onPress={() => setShowEmojis(!showEmojis)}
          className={`p-3 rounded-lg ${showEmojis ? 'bg-purple-500/30' : 'bg-white/20'}`}
        >
          <Text className="text-xl">😊</Text>
        </TouchableOpacity>

        <View className="flex-1">
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

export default WatchPartyChatInput;

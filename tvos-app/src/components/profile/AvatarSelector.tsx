/**
 * AvatarSelector - Avatar initial and color selection for profiles
 */

import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useDirection } from '@bayit/shared-hooks';

const AVATAR_COLORS = [
  '#a855f7', '#ff6b6b', '#4ecdc4', '#ffd93d',
  '#6c5ce7', '#a8e6cf', '#ff8b94', '#ffaaa5',
];

const AVATAR_INITIALS = ['U', 'M', 'F', 'K', 'B', 'G', 'C', 'P1', 'P2', 'A'];

interface AvatarSelectorProps {
  selectedEmoji: string;
  selectedColor: string;
  focusedItem: string | null;
  onSelectEmoji: (emoji: string) => void;
  onSelectColor: (color: string) => void;
  onFocusItem: (item: string | null) => void;
}

export { AVATAR_COLORS, AVATAR_INITIALS };

export function AvatarSelector({
  selectedEmoji, selectedColor, focusedItem,
  onSelectEmoji, onSelectColor, onFocusItem,
}: AvatarSelectorProps) {
  const { t } = useTranslation();
  const { isRTL, textAlign } = useDirection();

  return (
    <>
      <View className="mb-6">
        <Text className="text-base text-purple-500 mb-2 font-semibold" style={{ textAlign }}>
          {t('profiles.avatar', 'Avatar')}
        </Text>
        <View className="flex-wrap gap-2" style={{ flexDirection: isRTL ? 'row-reverse' : 'row' }}>
          {AVATAR_INITIALS.map((initial) => (
            <Pressable
              key={initial}
              className={`w-[60px] h-[60px] rounded-full bg-white/10 justify-center items-center border-[3px] ${
                selectedEmoji === initial ? 'border-purple-500 bg-purple-500/30' : 'border-transparent'
              } ${focusedItem === `initial-${initial}` ? 'border-white scale-110' : ''}`}
              onPress={() => onSelectEmoji(initial)}
              onFocus={() => onFocusItem(`initial-${initial}`)}
              onBlur={() => onFocusItem(null)}
            >
              <Text className="text-[32px] text-white font-bold">{initial}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View className="mb-6">
        <Text className="text-base text-purple-500 mb-2 font-semibold" style={{ textAlign }}>
          {t('profiles.color', 'Color')}
        </Text>
        <View className="flex-wrap gap-2" style={{ flexDirection: isRTL ? 'row-reverse' : 'row' }}>
          {AVATAR_COLORS.map((color) => (
            <Pressable
              key={color}
              className={`w-[50px] h-[50px] rounded-full border-[3px] ${
                selectedColor === color ? 'border-white' : 'border-transparent'
              } ${focusedItem === `color-${color}` ? 'scale-115 border-white' : ''}`}
              style={{ backgroundColor: color }}
              onPress={() => onSelectColor(color)}
              onFocus={() => onFocusItem(`color-${color}`)}
              onBlur={() => onFocusItem(null)}
            />
          ))}
        </View>
      </View>
    </>
  );
}

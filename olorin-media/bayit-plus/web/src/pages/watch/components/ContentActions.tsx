/**
 * Content Actions Component
 * Action buttons for adding to list, liking, and sharing content
 */

import { View, Text, Pressable } from 'react-native';
import { Plus, ThumbsUp, Share2 } from 'lucide-react';
import { GlassButton } from '@bayit/shared/ui';
import { colors } from '@bayit/shared/theme';

interface ContentActionsProps {
  addToListLabel: string;
  likeLabel: string;
  shareLabel: string;
}

export function ContentActions({
  addToListLabel,
  likeLabel,
  shareLabel,
}: ContentActionsProps) {
  return (
    <View className="flex-row flex-wrap gap-3 mb-6">
      <GlassButton
        title={addToListLabel}
        icon={<Plus size={18} color={colors.text} />}
      />
      <GlassButton
        title={likeLabel}
        icon={<ThumbsUp size={18} color={colors.text} />}
      />
      <Pressable className="flex-row items-center gap-2 px-4 py-3">
        <Share2 size={18} color={colors.textMuted} />
        <Text className="text-sm text-gray-400">{shareLabel}</Text>
      </Pressable>
    </View>
  );
}

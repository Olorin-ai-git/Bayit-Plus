import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useDirection } from '@/hooks/useDirection';
import { Podcast, RefreshCw, Search, X } from 'lucide-react';
import { GlassView, GlassInput } from '@bayit/shared/ui';
import { colors } from '@olorin/design-tokens';
import { z } from 'zod';

const PodcastsPageHeaderPropsSchema = z.object({
  syncing: z.boolean(),
  searchQuery: z.string(),
  onSyncPress: z.function().args().returns(z.void()),
  onSearchChange: z.function().args(z.string()).returns(z.void()),
});

export type PodcastsPageHeaderProps = z.infer<typeof PodcastsPageHeaderPropsSchema>;

export default function PodcastsPageHeader({
  syncing,
  searchQuery,
  onSyncPress,
  onSearchChange,
}: PodcastsPageHeaderProps) {
  const { t } = useTranslation();
  const { flexDirection, textAlign } = useDirection();

  return (
    <View className="gap-6">
      {/* Title and Sync Button */}
      <View className="flex-row items-center justify-between gap-2">
        <View
          className="flex-row items-center gap-2"
          style={{ flexDirection }}
        >
          <GlassView className="w-12 h-12 rounded-full justify-center items-center bg-emerald-500/20">
            <Podcast size={24} color={colors.success} />
          </GlassView>
          <Text
            className="text-[32px] font-bold text-white"
            style={{ textAlign }}
          >
            {t('podcasts.title')}
          </Text>
        </View>

        <Pressable
          onPress={onSyncPress}
          disabled={syncing}
          className="w-12 h-12 rounded-full justify-center items-center bg-emerald-500/20"
          style={[syncing && styles.syncButtonDisabled]}
        >
          <RefreshCw
            size={20}
            color={colors.text}
            className={syncing ? 'animate-spin' : ''}
          />
        </Pressable>
      </View>

      {/* Search Input */}
      <GlassInput
        leftIcon={<Search size={18} color={colors.textMuted} />}
        rightIcon={
          searchQuery ? (
            <Pressable onPress={() => onSearchChange('')}>
              <X size={18} color={colors.textMuted} />
            </Pressable>
          ) : undefined
        }
        placeholder={t('common.search')}
        value={searchQuery}
        onChangeText={onSearchChange}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  syncButtonDisabled: {
    opacity: 0.7,
  },
});

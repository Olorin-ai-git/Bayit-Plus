import React from 'react';
import {
  View,
  Text,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { GlassView } from '../ui/GlassView';
import { colors, spacing, fontSize, borderRadius } from '@olorin/design-tokens';
import { isTV } from '../../utils/platform';

interface IMDBFactsCardProps {
  imdbRating?: number;
  imdbVotes?: number;
  runtime?: string;
  releaseDate?: string;
  genres?: string[];
  director?: string;
  cast?: string[];
  showCompact?: boolean;
}

/**
 * IMDBFactsCard Component
 * Displays IMDB rating and movie facts in a glassmorphism card.
 */
export const IMDBFactsCard: React.FC<IMDBFactsCardProps> = ({
  imdbRating,
  imdbVotes,
  runtime,
  releaseDate,
  genres,
  director,
  cast,
  showCompact = false,
}) => {
  const { t } = useTranslation();

  // Format IMDB votes (e.g., 1,234,567 -> 1.2M)
  const formatVotes = (votes?: number): string => {
    if (!votes) return '';
    if (votes >= 1000000) {
      return `${(votes / 1000000).toFixed(1)}M`;
    }
    if (votes >= 1000) {
      return `${(votes / 1000).toFixed(0)}K`;
    }
    return votes.toString();
  };

  // Format rating with one decimal
  const formatRating = (rating?: number): string => {
    if (!rating) return '-';
    return rating.toFixed(1);
  };

  if (showCompact) {
    return (
      <GlassView className="flex-row items-center gap-2 px-4 py-2 rounded-lg" intensity="light">
        <View className="flex-row items-baseline gap-1">
          <View className="bg-[#F5C518] px-2 py-1 rounded">
            <Text className={`${isTV ? 'text-base' : 'text-sm'} font-black text-black tracking-tight`}>IMDb</Text>
          </View>
          <Text className={`${isTV ? 'text-2xl' : 'text-lg'} font-bold text-[#F5C518]`}>{formatRating(imdbRating)}</Text>
          <Text className="text-sm text-textSecondary">/10</Text>
        </View>
        {imdbVotes && (
          <Text className="text-xs text-textSecondary">
            ({formatVotes(imdbVotes)} {t('content.votes')})
          </Text>
        )}
      </GlassView>
    );
  }

  return (
    <GlassView className={`${isTV ? 'p-6' : 'p-4'} rounded-2xl my-4`} intensity="medium">
      {/* IMDB Rating Section */}
      <View className="flex-row items-center gap-4">
        <View className="bg-[#F5C518] px-2 py-1 rounded">
          <Text className={`${isTV ? 'text-base' : 'text-sm'} font-black text-black tracking-tight`}>IMDb</Text>
        </View>
        <View className="flex-1">
          <View className="flex-row items-baseline">
            <Text className={`${isTV ? 'text-lg' : 'text-base'} mr-1`}>⭐</Text>
            <Text className={`${isTV ? 'text-4xl' : 'text-[28px]'} font-bold text-white`}>{formatRating(imdbRating)}</Text>
            <Text className={`${isTV ? 'text-lg' : 'text-base'} text-textSecondary ml-0.5`}>/10</Text>
          </View>
          {imdbVotes && (
            <Text className="text-sm text-textSecondary mt-0.5">
              {formatVotes(imdbVotes)} {t('content.votes')}
            </Text>
          )}
        </View>
      </View>

      {/* Divider */}
      <View className="h-px bg-white/10 my-4" />

      {/* Facts Section */}
      <View className="gap-2">
        {runtime && (
          <FactRow label={t('content.runtime')} value={runtime} />
        )}
        {releaseDate && (
          <FactRow label={t('content.released')} value={releaseDate} />
        )}
        {genres && genres.length > 0 && (
          <FactRow label={t('content.genre')} value={genres.slice(0, 3).join(', ')} />
        )}
        {director && (
          <FactRow label={t('content.director')} value={director} />
        )}
        {cast && cast.length > 0 && (
          <FactRow
            label={t('content.starring')}
            value={cast.slice(0, 3).join(', ')}
          />
        )}
      </View>
    </GlassView>
  );
};

interface FactRowProps {
  label: string;
  value: string;
}

const FactRow: React.FC<FactRowProps> = ({ label, value }) => (
  <View className="flex-row items-center">
    <Text className={`${isTV ? 'w-[120px]' : 'w-[90px]'} ${isTV ? 'text-base' : 'text-sm'} text-textSecondary`}>{label}</Text>
    <Text className={`flex-1 ${isTV ? 'text-base' : 'text-sm'} text-white font-medium`} numberOfLines={1}>{value}</Text>
  </View>
);

export default IMDBFactsCard;

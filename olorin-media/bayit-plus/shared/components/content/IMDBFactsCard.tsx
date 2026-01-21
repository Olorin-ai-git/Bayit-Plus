import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { GlassView } from '../ui/GlassView';
import { colors, spacing, fontSize, borderRadius } from '../../theme';
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
      <GlassView style={styles.compactContainer} intensity="light">
        <View style={styles.compactRatingSection}>
          <View style={styles.imdbLogo}>
            <Text style={styles.imdbLogoText}>IMDb</Text>
          </View>
          <Text style={styles.compactRating}>{formatRating(imdbRating)}</Text>
          <Text style={styles.compactScale}>/10</Text>
        </View>
        {imdbVotes && (
          <Text style={styles.compactVotes}>
            ({formatVotes(imdbVotes)} {t('content.votes')})
          </Text>
        )}
      </GlassView>
    );
  }

  return (
    <GlassView style={styles.container} intensity="medium">
      {/* IMDB Rating Section */}
      <View style={styles.ratingSection}>
        <View style={styles.imdbLogo}>
          <Text style={styles.imdbLogoText}>IMDb</Text>
        </View>
        <View style={styles.ratingDetails}>
          <View style={styles.ratingRow}>
            <Text style={styles.starIcon}>⭐</Text>
            <Text style={styles.ratingValue}>{formatRating(imdbRating)}</Text>
            <Text style={styles.ratingScale}>/10</Text>
          </View>
          {imdbVotes && (
            <Text style={styles.votesText}>
              {formatVotes(imdbVotes)} {t('content.votes')}
            </Text>
          )}
        </View>
      </View>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Facts Section */}
      <View style={styles.factsSection}>
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
  <View style={styles.factRow}>
    <Text style={styles.factLabel}>{label}</Text>
    <Text style={styles.factValue} numberOfLines={1}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    padding: isTV ? spacing.lg : spacing.md,
    borderRadius: borderRadius.xl,
    marginVertical: spacing.md,
  },
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
  },
  ratingSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  imdbLogo: {
    backgroundColor: '#F5C518',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  imdbLogoText: {
    fontSize: isTV ? fontSize.md : fontSize.sm,
    fontWeight: '900',
    color: '#000',
    letterSpacing: -0.5,
  },
  ratingDetails: {
    flex: 1,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  starIcon: {
    fontSize: isTV ? fontSize.lg : fontSize.md,
    marginRight: spacing.xs,
  },
  ratingValue: {
    fontSize: isTV ? 36 : 28,
    fontWeight: '700',
    color: colors.text,
  },
  ratingScale: {
    fontSize: isTV ? fontSize.lg : fontSize.md,
    color: colors.textSecondary,
    marginLeft: 2,
  },
  votesText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginVertical: spacing.md,
  },
  factsSection: {
    gap: spacing.sm,
  },
  factRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  factLabel: {
    width: isTV ? 120 : 90,
    fontSize: isTV ? fontSize.md : fontSize.sm,
    color: colors.textSecondary,
  },
  factValue: {
    flex: 1,
    fontSize: isTV ? fontSize.md : fontSize.sm,
    color: colors.text,
    fontWeight: '500',
  },
  compactRatingSection: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.xs,
  },
  compactRating: {
    fontSize: isTV ? fontSize.xl : fontSize.lg,
    fontWeight: '700',
    color: '#F5C518',
  },
  compactScale: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  compactVotes: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
});

export default IMDBFactsCard;

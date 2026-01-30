/** Result display styles for AI Recommendations - tvOS (10-foot UI) */

import { StyleSheet } from 'react-native';
import { colors, spacing } from '@olorin/design-tokens';

export const resultStyles = StyleSheet.create({
  results: { flex: 1 },
  resultsContent: { paddingVertical: spacing[6] },
  summaryCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
    padding: spacing[6],
    marginBottom: spacing[8],
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  profileSummary: {
    fontSize: 28,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: spacing[4],
  },
  creditsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  creditsLabel: {
    fontSize: 24,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  creditsValue: {
    fontSize: 28,
    fontWeight: '600',
    color: colors.white,
  },
  creditsSeparator: {
    fontSize: 28,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  resultsTitle: {
    fontSize: 36,
    fontWeight: '600',
    color: colors.white,
    marginBottom: spacing[6],
  },
  resultsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[6],
  },
  recommendationCard: {
    width: '48%',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    padding: spacing[6],
  },
  recommendationCardFocused: {
    transform: [{ scale: 1.05 }],
    borderColor: '#3B82F6',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  recommendationContent: {
    flexDirection: 'row',
    gap: spacing[4],
  },
  rankBadge: {
    width: 60,
    height: 60,
    backgroundColor: '#3B82F6',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankBadgeText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.white,
  },
  recommendationPoster: {
    width: 120,
    height: 180,
    borderRadius: 12,
  },
  recommendationTextContainer: {
    flex: 1,
  },
  recommendationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing[2],
    marginBottom: spacing[3],
  },
  recommendationTitleContainer: {
    flex: 1,
  },
  recommendationTitle: {
    fontSize: 30,
    fontWeight: '600',
    color: colors.white,
  },
  recommendationYear: {
    fontSize: 22,
    color: 'rgba(255, 255, 255, 0.4)',
    marginTop: 4,
  },
  matchBadge: {
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    borderWidth: 2,
    borderColor: 'rgba(34, 197, 94, 0.3)',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: 8,
  },
  matchBadgeText: {
    fontSize: 22,
    color: '#86EFAC',
    fontWeight: '600',
  },
  recommendationDescription: {
    fontSize: 26,
    color: 'rgba(255, 255, 255, 0.6)',
    lineHeight: 34,
    marginBottom: spacing[3],
  },
  explanationContainer: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderWidth: 2,
    borderColor: 'rgba(59, 130, 246, 0.2)',
    borderRadius: 12,
    padding: spacing[4],
    marginBottom: spacing[3],
  },
  explanationText: {
    fontSize: 24,
    color: '#93C5FD',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[3],
  },
  typeBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: 8,
  },
  typeText: {
    fontSize: 22,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  genreBadge: {
    backgroundColor: 'rgba(147, 51, 234, 0.2)',
    borderWidth: 2,
    borderColor: 'rgba(147, 51, 234, 0.3)',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: 8,
  },
  genreText: {
    fontSize: 22,
    color: '#C4B5FD',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing[16],
  },
  emptyStateText: {
    fontSize: 32,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
  },
  loadingState: {
    alignItems: 'center',
    paddingVertical: spacing[16],
  },
  loadingText: {
    fontSize: 32,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: spacing[8],
  },
  errorContainer: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 2,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: 16,
    padding: spacing[6],
    marginBottom: spacing[6],
  },
  errorText: {
    fontSize: 28,
    color: '#FCA5A5',
  },
});

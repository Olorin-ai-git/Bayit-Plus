/**
 * TriviaScreenMobile - Styles
 */

import { StyleSheet } from 'react-native';
import { spacing, borderRadius, fontSize } from '@olorin/design-tokens';
import { Colors } from '../theme/colors';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.Background.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: Colors.Text.secondary,
    fontSize: fontSize.base,
    marginTop: spacing[3],
  },
  scrollContent: {
    paddingVertical: spacing[6],
    paddingHorizontal: spacing[4],
  },
  screenTitle: {
    fontSize: fontSize['3xl'],
    fontWeight: '700',
    color: Colors.Text.primary,
    marginBottom: spacing[4],
  },
  startQuizCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.Glass.whiteMedium,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    marginBottom: spacing[4],
    borderWidth: 1,
    borderColor: Colors.Glass.border,
  },
  startQuizTextContainer: {
    flex: 1,
    marginLeft: spacing[3],
  },
  startQuizTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: Colors.Text.primary,
  },
  startQuizSubtitle: {
    fontSize: fontSize.sm,
    color: Colors.Text.secondary,
    marginTop: spacing[0.5],
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: Colors.Text.primary,
    marginBottom: spacing[3],
    marginTop: spacing[5],
  },
  difficultyRow: {
    gap: spacing[2],
  },
  difficultyChip: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.full,
    backgroundColor: Colors.Glass.whiteMedium,
    borderWidth: 1,
    borderColor: Colors.Glass.borderLight,
  },
  difficultyChipActive: {
    backgroundColor: Colors.Primary.default,
    borderColor: Colors.Primary.p500,
  },
  difficultyText: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    color: Colors.Text.secondary,
  },
  difficultyTextActive: {
    color: Colors.Text.primary,
    fontWeight: '600',
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[3],
  },
  categoryCard: {
    width: '30%',
    backgroundColor: Colors.Glass.whiteMedium,
    borderRadius: borderRadius.md,
    padding: spacing[4],
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.Glass.borderLight,
  },
  categoryLabel: {
    fontSize: fontSize.xs,
    color: Colors.Text.primary,
    marginTop: spacing[2],
    textAlign: 'center',
  },
  leaderboardRow: {
    alignItems: 'center',
    backgroundColor: Colors.Glass.whiteSubtle,
    borderRadius: borderRadius.DEFAULT,
    padding: spacing[3],
    marginBottom: spacing[2],
  },
  leaderboardRank: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: Colors.Special.gold,
    width: spacing[8],
    textAlign: 'center',
  },
  leaderboardName: {
    flex: 1,
    fontSize: fontSize.base,
    color: Colors.Text.primary,
    marginHorizontal: spacing[2],
  },
  leaderboardScore: {
    fontSize: fontSize.base,
    fontWeight: '600',
    color: Colors.Primary.p400,
  },
});

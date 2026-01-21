/**
 * Styles for JudaismScreen and its components.
 */

import { StyleSheet } from 'react-native';
import { colors, spacing, borderRadius } from '../../theme';
import { isTV } from '../../utils/platform';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: colors.text,
    fontSize: 18,
    marginTop: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xxl,
    paddingTop: 40,
    paddingBottom: spacing.lg,
  },
  headerIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: `${colors.primary}33`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerIconText: {
    fontSize: 28,
  },
  title: {
    fontSize: 42,
    fontWeight: 'bold',
    color: colors.text,
  },
  subtitle: {
    fontSize: 18,
    color: colors.textSecondary,
    marginTop: 2,
  },
  categories: {
    paddingHorizontal: 48,
    marginBottom: 24,
    gap: 12,
  },
  grid: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
    paddingTop: spacing.md,
  },
  cardTouchable: {
    flex: 1,
    margin: spacing.sm,
    maxWidth: isTV ? '20%' : '33.33%',
  },
  card: {
    backgroundColor: colors.backgroundLight,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: 'transparent',
  },
  cardFocused: {
    borderColor: colors.primary,
  },
  cardImage: {
    width: '100%',
    aspectRatio: 16 / 9,
  },
  cardImagePlaceholder: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: colors.backgroundLighter,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderIcon: {
    fontSize: 48,
  },
  categoryBadge: {
    position: 'absolute',
    top: 8,
    backgroundColor: colors.overlayDark,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  categoryBadgeText: {
    fontSize: 14,
  },
  durationBadge: {
    position: 'absolute',
    top: 8,
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  durationText: {
    fontSize: 10,
    color: colors.text,
    fontWeight: 'bold',
  },
  cardContent: {
    padding: spacing.sm,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  cardRabbi: {
    fontSize: 12,
    color: colors.primaryLight,
    marginTop: 2,
  },
  cardDescription: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playIcon: {
    fontSize: 24,
    color: colors.text,
    marginLeft: 4,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyCard: {
    padding: spacing.xxl,
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  jerusalemSection: {
    marginBottom: spacing.lg,
  },
  // Shabbat Banner Styles
  shabbatBanner: {
    marginHorizontal: spacing.xxl,
    marginBottom: spacing.lg,
    padding: spacing.lg,
    borderRadius: borderRadius.xl,
  },
  shabbatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  shabbatIconsContainer: {
    flexDirection: 'row',
    marginRight: spacing.md,
  },
  shabbatCandle: {
    fontSize: 40,
  },
  shabbatTitleContainer: {
    flex: 1,
  },
  shabbatTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
  },
  shabbatSubtitle: {
    fontSize: 18,
    color: colors.warning,
    marginTop: 2,
  },
  parashaContainer: {
    backgroundColor: `${colors.primary}33`,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    alignItems: 'center',
  },
  parashaLabel: {
    fontSize: 14,
    color: colors.primaryLight,
  },
  parashaName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 4,
  },
  shabbatTimesRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  shabbatTimeCard: {
    flex: 1,
    backgroundColor: `${colors.warning}26`,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
  },
  shabbatTimeIcon: {
    fontSize: 28,
  },
  shabbatTimeLabel: {
    fontSize: 12,
    color: colors.warning,
    marginTop: spacing.xs,
  },
  shabbatTimeValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 4,
  },
  // News Styles
  newsList: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  newsItem: {
    flex: 1,
    margin: spacing.sm,
    backgroundColor: colors.backgroundLight,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  newsItemFocused: {
    borderColor: colors.primary,
  },
  newsItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  newsSourceBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  newsSourceText: {
    fontSize: 12,
    color: colors.text,
    fontWeight: '500',
  },
  newsDate: {
    fontSize: 12,
    color: colors.textMuted,
  },
  newsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  newsSummary: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  // Calendar Styles
  calendarContainer: {
    paddingHorizontal: spacing.xxl,
    paddingBottom: spacing.xxl,
  },
  calendarWidget: {
    padding: spacing.lg,
    borderRadius: borderRadius.xl,
    maxWidth: 500,
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  calendarIcon: {
    fontSize: 24,
  },
  calendarTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  hebrewDateContainer: {
    backgroundColor: `${colors.primary}33`,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    alignItems: 'center',
  },
  hebrewDate: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
  },
  gregorianDate: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  specialDayBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${colors.gold}4D`,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    marginBottom: spacing.md,
    alignSelf: 'center',
    gap: 4,
  },
  specialDayIcon: {
    fontSize: 14,
  },
  specialDayText: {
    fontSize: 14,
    color: colors.gold,
    fontWeight: '600',
  },
  parashaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundLighter,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  parashaRowIcon: {
    fontSize: 18,
  },
  parashaRowLabel: {
    fontSize: 14,
    color: colors.textMuted,
  },
  parashaRowValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  holidaysList: {
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  holidayItem: {
    backgroundColor: colors.backgroundLighter,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  holidayItemText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
});

/**
 * JudaismScreen Styles - Shared styles for Judaism screen components.
 *
 * Used by: CalendarWidget, JudaismCard, NewsItemCard, ShabbatEveBanner
 */

import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  // JudaismCard
  cardTouchable: {
    flex: 1,
    maxWidth: '20%',
    padding: 8,
  },
  card: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'rgba(20,20,35,0.85)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  cardFocused: {
    borderColor: '#a855f7',
    borderWidth: 3,
  },
  cardImage: {
    width: '100%',
    aspectRatio: 16 / 9,
  },
  cardImagePlaceholder: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: 'rgba(126,34,206,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderIcon: {
    fontSize: 36,
  },
  categoryBadge: {
    position: 'absolute',
    top: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  categoryBadgeText: {
    fontSize: 14,
  },
  durationBadge: {
    position: 'absolute',
    bottom: 8,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  durationText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  cardContent: {
    padding: 12,
  },
  cardTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  cardRabbi: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 2,
  },
  cardDescription: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(126,34,206,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(126,34,206,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playIcon: {
    color: '#ffffff',
    fontSize: 24,
  },

  // NewsItemCard
  newsItem: {
    backgroundColor: 'rgba(20,20,35,0.85)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  newsItemFocused: {
    borderColor: '#a855f7',
    borderWidth: 3,
  },
  newsItemContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  newsSourceBadge: {
    backgroundColor: 'rgba(126,34,206,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  newsSourceText: {
    color: '#a855f7',
    fontSize: 12,
    fontWeight: '600',
  },
  newsDate: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 13,
  },
  newsTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
  },
  newsSummary: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
    lineHeight: 20,
  },

  // CalendarWidget
  calendarWidget: {
    padding: 24,
    marginBottom: 16,
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  calendarIcon: {
    fontSize: 28,
  },
  calendarTitle: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '700',
  },
  hebrewDateContainer: {
    alignItems: 'center',
    paddingVertical: 20,
    marginBottom: 16,
  },
  hebrewDate: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 6,
  },
  gregorianDate: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 16,
  },
  specialDayBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(126,34,206,0.2)',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 8,
  },
  specialDayIcon: {
    fontSize: 18,
  },
  specialDayText: {
    color: '#a855f7',
    fontSize: 16,
    fontWeight: '600',
  },
  parashaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  parashaRowIcon: {
    fontSize: 18,
  },
  parashaRowLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 15,
    fontWeight: '500',
  },
  parashaRowValue: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  holidaysList: {
    marginTop: 12,
    gap: 8,
  },
  holidayItem: {
    backgroundColor: 'rgba(255,215,0,0.1)',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  holidayItemText: {
    color: '#ffd700',
    fontSize: 15,
    fontWeight: '600',
  },

  // ShabbatEveBanner
  shabbatBanner: {
    marginHorizontal: 48,
    marginBottom: 16,
    padding: 24,
    backgroundColor: 'rgba(126,34,206,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(126,34,206,0.3)',
  },
  shabbatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  shabbatIconsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  shabbatCandle: {
    fontSize: 28,
  },
  shabbatTitleContainer: {
    flex: 1,
  },
  shabbatTitle: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '800',
  },
  shabbatSubtitle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 15,
    marginTop: 2,
  },
  parashaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 10,
  },
  parashaLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 15,
    fontWeight: '500',
  },
  parashaName: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  shabbatTimesRow: {
    flexDirection: 'row',
    gap: 16,
  },
  shabbatTimeCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
  },
  shabbatTimeIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  shabbatTimeLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 4,
  },
  shabbatTimeValue: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '800',
  },
});

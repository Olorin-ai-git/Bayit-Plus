import { StyleSheet } from 'react-native';
import { config } from '../../config/appConfig';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  content: {
    flex: 1,
    paddingHorizontal: config.tv.safeZoneMarginPt,
  },
  title: {
    fontSize: config.tv.minTitleTextSizePt,
    fontWeight: '700',
    color: '#ffffff',
    marginTop: 24,
    marginBottom: 24,
  },
  timeSlotsContent: {
    gap: 12,
    marginBottom: 32,
  },
  timeSlot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    marginRight: 12,
  },
  timeSlotSelected: {
    backgroundColor: '#A855F7',
  },
  timeText: {
    fontSize: config.tv.minButtonTextSizePt,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
  },
  timeTextSelected: {
    color: '#ffffff',
  },
  currentBadge: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10b981',
  },
  gridContent: {
    paddingBottom: config.tv.safeZoneMarginPt,
  },
  gridRow: {
    gap: 16,
    marginBottom: 16,
  },
  programButton: {
    flex: 1,
  },
  programCard: {
    backgroundColor: 'rgba(20,20,35,0.85)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.1)',
    flexDirection: 'row',
    gap: 12,
    minHeight: 140,
  },
  programCardFocused: {
    borderColor: '#A855F7',
    borderWidth: config.tv.focusBorderWidth,
    transform: [{ scale: 1.02 }],
  },
  channelLogoContainer: {
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 12,
  },
  channelLogo: {
    width: 48,
    height: 48,
    borderRadius: 8,
  },
  programInfo: {
    flex: 1,
    gap: 4,
  },
  channelName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#A855F7',
  },
  programTitle: {
    fontSize: config.tv.minBodyTextSizePt,
    fontWeight: '700',
    color: '#ffffff',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  timeLabel: {
    fontSize: 20,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
  },
  durationLabel: {
    fontSize: 18,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.5)',
  },
  programDescription: {
    fontSize: 20,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.6)',
    marginTop: 4,
  },
  liveBadgeContainer: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(16,185,129,0.2)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  liveBadge: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10b981',
  },
  liveText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#10b981',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: config.tv.minBodyTextSizePt,
    color: 'rgba(255,255,255,0.7)',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  emptyText: {
    fontSize: config.tv.minTitleTextSizePt,
    color: 'rgba(255,255,255,0.8)',
  },
});

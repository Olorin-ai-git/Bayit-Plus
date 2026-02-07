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
  genresContent: {
    gap: 12,
    marginBottom: 32,
  },
  genre: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    marginRight: 12,
  },
  genreSelected: {
    backgroundColor: '#A855F7',
  },
  genreText: {
    fontSize: config.tv.minButtonTextSizePt,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
  },
  genreTextSelected: {
    color: '#ffffff',
  },
  gridContent: {
    paddingBottom: config.tv.safeZoneMarginPt,
  },
  gridRow: {
    gap: 16,
    marginBottom: 16,
  },
  stationButton: {
    width: 180,
  },
  stationCard: {
    backgroundColor: 'rgba(20,20,35,0.85)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    gap: 8,
  },
  stationCardFocused: {
    borderColor: '#A855F7',
    borderWidth: config.tv.focusBorderWidth,
    transform: [{ scale: config.tv.focusScaleFactor }],
  },
  logoContainer: {
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 40,
  },
  logo: {
    width: 64,
    height: 64,
  },
  stationName: {
    fontSize: config.tv.minButtonTextSizePt,
    fontWeight: '600',
    color: '#ffffff',
    textAlign: 'center',
  },
  frequency: {
    fontSize: 18,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.6)',
  },
  playingBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#10b981',
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
  },
  emptyText: {
    fontSize: config.tv.minTitleTextSizePt,
    color: 'rgba(255,255,255,0.8)',
  },
});

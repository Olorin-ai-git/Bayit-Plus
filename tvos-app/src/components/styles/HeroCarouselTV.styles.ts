/**
 * Styles for HeroCarouselTV component
 * Extracted from HeroCarouselTV.tsx for file size compliance
 */

import { StyleSheet, Dimensions } from 'react-native';
import { config } from '../../config/appConfig';

const WINDOW_WIDTH = Dimensions.get('window').width;
export const HERO_WIDTH = WINDOW_WIDTH - config.tv.safeZoneMarginPt * 2;
export const HERO_HEIGHT = 750;
export const AUTO_ADVANCE_INTERVAL = 6000;

const styles = StyleSheet.create({
  container: {
    marginBottom: 48,
  },
  listContent: {
    paddingHorizontal: config.tv.safeZoneMarginPt,
  },
  heroItem: {
    marginRight: 24,
  },
  heroCard: {
    width: HERO_WIDTH,
    height: HERO_HEIGHT,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'rgba(20,20,35,0.85)',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  placeholderIcon: {
    width: 120,
    height: 120,
    borderRadius: 24,
    backgroundColor: 'rgba(168,85,247,0.2)',
  },
  gradientOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '60%',
    justifyContent: 'flex-end',
    padding: 48,
  },
  heroContent: {
    gap: 12,
  },
  newBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#A855F7',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  newBadgeText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 1,
  },
  heroTitle: {
    fontSize: 48,
    fontWeight: '700',
    color: '#ffffff',
    lineHeight: 56,
  },
  heroSubtitle: {
    fontSize: 28,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 36,
  },
  heroDescription: {
    fontSize: 24,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 32,
    maxWidth: '80%',
  },
  subtitleIndicator: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(168,85,247,0.3)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginTop: 8,
  },
  subtitleIndicatorText: {
    fontSize: 20,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
  },
});

export default styles;

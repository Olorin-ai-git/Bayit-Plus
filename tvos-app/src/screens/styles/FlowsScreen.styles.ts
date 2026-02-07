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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginTop: 24,
    marginBottom: 24,
  },
  title: {
    fontSize: config.tv.minTitleTextSizePt,
    fontWeight: '700',
    color: '#ffffff',
  },
  categoriesContent: {
    gap: 12,
    marginBottom: 32,
  },
  categoryButton: {
    marginRight: 12,
  },
  category: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  categorySelected: {
    backgroundColor: '#A855F7',
    borderColor: '#A855F7',
  },
  categoryText: {
    fontSize: config.tv.minButtonTextSizePt,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
  },
  categoryTextSelected: {
    color: '#ffffff',
  },
  gridContent: {
    paddingBottom: config.tv.safeZoneMarginPt,
  },
  gridRow: {
    gap: 16,
    marginBottom: 16,
  },
  flowButton: {
    flex: 1,
  },
  flowCard: {
    backgroundColor: 'rgba(20,20,35,0.85)',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  flowCardFocused: {
    borderColor: '#A855F7',
    borderWidth: config.tv.focusBorderWidth,
    transform: [{ scale: 1.02 }],
  },
  thumbnailContainer: {
    width: '100%',
    aspectRatio: 16 / 9,
    position: 'relative',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  thumbnailPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(168,85,247,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playOverlay: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -40 }, { translateY: -40 }],
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(168,85,247,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  flowInfo: {
    padding: 16,
    gap: 8,
  },
  flowTitle: {
    fontSize: config.tv.minBodyTextSizePt,
    fontWeight: '700',
    color: '#ffffff',
  },
  flowDescription: {
    fontSize: 20,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.6)',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 4,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 18,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.6)',
  },
  shuffleBadge: {
    marginLeft: 'auto',
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

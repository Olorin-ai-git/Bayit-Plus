/**
 * Styles for ContentShelf component
 * Extracted from ContentShelf.tsx for file size compliance
 */

import { StyleSheet } from 'react-native';
import { config } from '../../config/appConfig';

const styles = StyleSheet.create({
  container: {
    marginBottom: 32,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: config.tv.safeZoneMarginPt,
    marginBottom: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  shelfTitle: {
    fontSize: 44,
    fontWeight: '700',
    color: '#ffffff',
    lineHeight: 52,
  },
  itemCount: {
    fontSize: config.tv.minButtonTextSizePt,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.5)',
    lineHeight: config.tv.minButtonTextSizePt * 1.2,
  },
  seeAllButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  seeAllButtonFocused: {
    backgroundColor: 'rgba(168,85,247,0.3)',
    borderColor: '#A855F7',
    transform: [{ scale: 1.05 }],
  },
  seeAllText: {
    fontSize: config.tv.minButtonTextSizePt,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
  },
  seeAllTextFocused: {
    color: '#ffffff',
  },
  listContent: {
    paddingLeft: config.tv.safeZoneMarginPt - 8,
    paddingRight: config.tv.safeZoneMarginPt,
  },
  emptyContainer: {
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: config.tv.safeZoneMarginPt,
  },
  emptyText: {
    fontSize: config.tv.minBodyTextSizePt,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.5)',
    lineHeight: config.tv.minBodyTextSizePt * 1.2,
  },
});

export default styles;

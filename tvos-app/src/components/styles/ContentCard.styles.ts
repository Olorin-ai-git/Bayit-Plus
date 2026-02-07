/**
 * Styles for ContentCard component
 * Extracted from ContentCard.tsx for file size compliance
 */

import { StyleSheet } from 'react-native';
import { config } from '../../config/appConfig';

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 8,
  },
  card: {
    width: 320,
    height: 220,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'rgba(20,20,35,0.85)',
  },
  thumbnailContainer: {
    width: '100%',
    height: 180,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  placeholderContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  placeholder: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: 'rgba(168,85,247,0.2)',
  },
  badgeContainer: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    gap: 8,
  },
  contentOverlay: {
    flex: 1,
    padding: 12,
    justifyContent: 'flex-end',
  },
  textContainer: {
    gap: 4,
  },
  title: {
    fontSize: config.tv.minBodyTextSizePt,
    fontWeight: '600',
    color: '#ffffff',
    lineHeight: config.tv.minBodyTextSizePt * 1.2,
  },
  subtitle: {
    fontSize: config.tv.minButtonTextSizePt,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.7)',
    lineHeight: config.tv.minButtonTextSizePt * 1.2,
  },
});

export default styles;

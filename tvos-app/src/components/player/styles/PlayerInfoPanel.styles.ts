/**
 * Styles for PlayerInfoPanel component
 * Extracted from PlayerInfoPanel.tsx for file size compliance
 */

import { StyleSheet } from 'react-native';
import { config } from '../../../config/appConfig';

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  panel: {
    width: 500,
    height: '100%',
    backgroundColor: 'rgba(20,20,35,0.95)',
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(255,255,255,0.1)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: config.tv.safeZoneMarginPt,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  headerTitle: {
    fontSize: config.tv.minTitleTextSizePt,
    fontWeight: '700',
    color: '#ffffff',
  },
  closeButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  contentInner: {
    padding: 32,
    gap: 24,
  },
  title: {
    fontSize: 40,
    fontWeight: '700',
    color: '#ffffff',
    lineHeight: 48,
  },
  episodeInfo: {
    fontSize: config.tv.minBodyTextSizePt,
    fontWeight: '600',
    color: '#A855F7',
  },
  metadataRow: {
    flexDirection: 'row',
    gap: 16,
  },
  metadataItem: {
    fontSize: config.tv.minButtonTextSizePt,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.7)',
  },
  section: {
    gap: 8,
  },
  sectionTitle: {
    fontSize: config.tv.minBodyTextSizePt,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
  },
  description: {
    fontSize: config.tv.minButtonTextSizePt,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.8)',
    lineHeight: config.tv.minButtonTextSizePt * 1.5,
  },
  castText: {
    fontSize: config.tv.minButtonTextSizePt,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.7)',
    lineHeight: config.tv.minButtonTextSizePt * 1.4,
  },
  directorText: {
    fontSize: config.tv.minButtonTextSizePt,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.7)',
  },
});

export default styles;

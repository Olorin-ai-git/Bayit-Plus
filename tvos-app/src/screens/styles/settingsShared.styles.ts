/**
 * Shared Settings Screen Styles for tvOS
 * Reusable style definitions for all settings sub-screens
 */

import { StyleSheet } from 'react-native';
import { config } from '../../config/appConfig';

export const settingsSharedStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  content: {
    flex: 1,
  },
  contentInner: {
    paddingHorizontal: config.tv.safeZoneMarginPt,
    paddingBottom: config.tv.safeZoneMarginPt,
  },
  screenTitle: {
    fontSize: config.tv.minTitleTextSizePt,
    fontWeight: '700',
    color: '#ffffff',
    marginTop: 24,
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#ffffff',
    marginTop: 24,
    marginBottom: 16,
  },
  section: {
    gap: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: config.tv.minBodyTextSizePt,
    color: 'rgba(255,255,255,0.7)',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: config.tv.safeZoneMarginPt,
  },
  errorText: {
    fontSize: config.tv.minBodyTextSizePt,
    fontWeight: '600',
    color: '#EF4444',
    textAlign: 'center',
  },
  errorHint: {
    fontSize: 24,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
  },
  actionButton: {
    width: '100%',
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    backgroundColor: 'rgba(20,20,35,0.85)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  actionCardFocused: {
    borderColor: '#A855F7',
    borderWidth: config.tv.focusBorderWidth,
    transform: [{ scale: 1.02 }],
  },
  actionCardDanger: {
    borderColor: 'rgba(239,68,68,0.3)',
  },
  actionCardDangerFocused: {
    borderColor: '#EF4444',
    borderWidth: config.tv.focusBorderWidth,
    transform: [{ scale: 1.02 }],
  },
  actionIconContainer: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(168,85,247,0.2)',
    borderRadius: 10,
  },
  actionIconContainerDanger: {
    backgroundColor: 'rgba(239,68,68,0.2)',
  },
  actionContent: {
    flex: 1,
    gap: 4,
  },
  actionLabel: {
    fontSize: config.tv.minBodyTextSizePt,
    fontWeight: '700',
    color: '#ffffff',
  },
  actionLabelDanger: {
    color: '#EF4444',
  },
  actionDescription: {
    fontSize: 22,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.6)',
  },
});

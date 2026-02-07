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
    marginBottom: 32,
  },
  gridContent: {
    paddingBottom: config.tv.safeZoneMarginPt,
  },
  row: {
    gap: 20,
    marginBottom: 20,
  },
  channelButton: {
    width: 220,
  },
  channelCard: {
    backgroundColor: 'rgba(20,20,35,0.85)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.1)',
    gap: 12,
  },
  channelCardFocused: {
    borderColor: '#A855F7',
    borderWidth: config.tv.focusBorderWidth,
    transform: [{ scale: config.tv.focusScaleFactor }],
  },
  logoContainer: {
    width: 120,
    height: 120,
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 12,
  },
  logo: {
    width: 100,
    height: 100,
  },
  logoPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 12,
    backgroundColor: 'rgba(168,85,247,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoPlaceholderText: {
    fontSize: 48,
    fontWeight: '700',
    color: '#A855F7',
  },
  channelInfo: {
    gap: 4,
  },
  channelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  channelNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#A855F7',
  },
  liveBadge: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10b981',
  },
  channelName: {
    fontSize: config.tv.minButtonTextSizePt,
    fontWeight: '600',
    color: '#ffffff',
    lineHeight: config.tv.minButtonTextSizePt * 1.2,
  },
  programTitle: {
    fontSize: 18,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.6)',
    lineHeight: 22,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: config.tv.minBodyTextSizePt,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.7)',
  },
});

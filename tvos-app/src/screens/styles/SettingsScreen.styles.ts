import { StyleSheet } from 'react-native';
import { config } from '../../config/appConfig';

export const styles = StyleSheet.create({
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
  title: {
    fontSize: config.tv.minTitleTextSizePt,
    fontWeight: '700',
    color: '#ffffff',
    marginTop: 24,
    marginBottom: 32,
  },
  section: {
    marginBottom: 40,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 36,
    fontWeight: '700',
    color: '#ffffff',
  },
  sectionContent: {
    gap: 12,
  },
  settingButton: {
    width: '100%',
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(20,20,35,0.85)',
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  settingItemFocused: {
    borderColor: '#A855F7',
    borderWidth: config.tv.focusBorderWidth,
    transform: [{ scale: 1.02 }],
  },
  settingInfo: {
    flex: 1,
    gap: 4,
  },
  settingTitle: {
    fontSize: config.tv.minBodyTextSizePt,
    fontWeight: '600',
    color: '#ffffff',
  },
  settingSubtitle: {
    fontSize: config.tv.minButtonTextSizePt,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.6)',
  },
  settingValue: {
    fontSize: config.tv.minBodyTextSizePt,
    fontWeight: '600',
    color: '#A855F7',
  },
  infoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginTop: 40,
    paddingVertical: 20,
  },
  infoText: {
    fontSize: config.tv.minButtonTextSizePt,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.5)',
  },
});

import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 60, paddingVertical: 40, backgroundColor: '#000000' },
  sectionTitle: { fontSize: 48, fontWeight: '700', color: '#FFFFFF', marginBottom: 40 },
  settingGroup: { marginBottom: 48 },
  settingLabel: { fontSize: 28, fontWeight: '600', color: '#A855F7', marginBottom: 16 },
  languageGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  languageButton: { paddingHorizontal: 24, paddingVertical: 16, borderRadius: 12, borderWidth: 4, minHeight: 80, minWidth: 140, justifyContent: 'center', alignItems: 'center' },
  languageButtonText: { fontSize: 24, color: '#FFFFFF', textAlign: 'center' },
  toggleButton: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 32, paddingVertical: 20, borderRadius: 12, borderWidth: 4, minHeight: 100, gap: 20 },
  toggleIcon: { color: '#FFFFFF' },
  toggleLabel: { fontSize: 28, fontWeight: '600', color: '#FFFFFF' },
  rateControlContainer: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  rateButton: { width: 100, height: 100, borderRadius: 12, borderWidth: 4, backgroundColor: 'rgba(168, 85, 247, 0.2)', justifyContent: 'center', alignItems: 'center' },
  rateButtonText: { fontSize: 40, fontWeight: '700', color: '#A855F7' },
  rateDisplay: { flex: 1, alignItems: 'center', paddingVertical: 20 },
  rateValue: { fontSize: 32, fontWeight: '700', color: '#A855F7' },
});

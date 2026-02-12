/**
 * PhoneticMirrorScreen styles - Extracted for 200-line limit compliance.
 */
import { StyleSheet } from 'react-native';

export const QUALITY_COLORS: Record<string, string> = {
  excellent: '#34C759', good: '#30D158', fair: '#FF9F0A',
  needs_practice: '#FF6B35', no_match: '#FF3B30',
};

export function getWordColor(score: number): string {
  if (score >= 0.9) return '#34C759';
  if (score >= 0.7) return '#30D158';
  if (score >= 0.5) return '#FF9F0A';
  return '#FF3B30';
}

export const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1E1E2E', padding: 20, alignItems: 'center' },
  phraseCard: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 20, padding: 28, width: '100%', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  phraseHebrew: { fontSize: 32, fontWeight: '700', color: '#FFF', marginBottom: 8 },
  translit: { fontSize: 18, color: 'rgba(255,255,255,0.6)' },
  translation: { fontSize: 14, color: 'rgba(255,255,255,0.4)' },
  micBtn: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,59,48,0.2)', justifyContent: 'center', alignItems: 'center', marginTop: 32, borderWidth: 2, borderColor: 'rgba(255,59,48,0.6)' },
  micBtnActive: { backgroundColor: 'rgba(255,59,48,0.5)', borderColor: '#FF3B30' },
  feedbackContainer: { alignItems: 'center', width: '100%', marginTop: 16 },
  scoreText: { fontSize: 48, fontWeight: '800', color: '#FFF' },
  qualityBadge: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 12, marginTop: 8, marginBottom: 16 },
  qualityText: { fontSize: 14, fontWeight: '600', color: '#FFF' },
  wordRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12, marginBottom: 6, width: '100%' },
  wordText: { fontSize: 20, fontWeight: '600', color: '#FFF' },
  wordScore: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  wordScoreText: { fontSize: 12, fontWeight: '700', color: '#FFF' },
  actions: { flexDirection: 'row', gap: 12, marginTop: 20 },
  errorText: { color: '#FF3B30', marginTop: 12, textAlign: 'center' },
});

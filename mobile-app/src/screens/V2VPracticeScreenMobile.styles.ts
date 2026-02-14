/**
 * V2VPracticeScreenMobile styles - Extracted for 200-line limit compliance.
 */
import { StyleSheet } from 'react-native';
import { Colors } from '../theme/colors';

export const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.Background.primary },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  backButton: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.Glass.whiteSubtle,
    justifyContent: 'center', alignItems: 'center',
  },
  title: { fontSize: 18, fontWeight: '700', color: Colors.Text.primary, flex: 1 },
  scoreBadge: {
    backgroundColor: Colors.Primary.p900, borderRadius: 16,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  scoreBadgeText: { fontSize: 14, fontWeight: '700', color: Colors.Primary.p300 },
  wordCard: {
    alignItems: 'center', padding: 28, marginHorizontal: 20, marginTop: 16,
    backgroundColor: Colors.Glass.whiteSubtle, borderRadius: 20,
    borderWidth: 1, borderColor: Colors.Glass.whiteMedium,
  },
  wordHebrew: {
    fontSize: 36, fontWeight: '700', color: Colors.Text.primary, marginBottom: 8,
  },
  wordTranslit: { fontSize: 18, color: Colors.Text.secondary },
  wordTranslation: { fontSize: 14, color: Colors.Text.muted, marginTop: 4 },
  recordSection: { alignItems: 'center', marginTop: 32, gap: 12 },
  micButton: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: Colors.Error.alpha20,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: Colors.Error.alpha60,
  },
  micButtonActive: {
    backgroundColor: Colors.Error.alpha50, borderColor: Colors.Error.default,
  },
  recordHint: { fontSize: 14, color: Colors.Text.muted },
  processingSection: { alignItems: 'center', marginTop: 32, gap: 12 },
  processingText: { fontSize: 15, color: Colors.Text.secondary },
  resultActions: {
    flexDirection: 'row', justifyContent: 'center', gap: 12,
    paddingHorizontal: 20, paddingBottom: 20,
  },
  errorText: {
    color: Colors.Error.default, fontSize: 14, textAlign: 'center',
    paddingHorizontal: 20, marginTop: 12,
  },
});

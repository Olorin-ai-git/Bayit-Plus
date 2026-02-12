import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1E1E2E', justifyContent: 'center', alignItems: 'center' },
  instructionsContainer: { padding: 32, alignItems: 'center' },
  title: { color: '#fff', fontSize: 24, fontWeight: '700', marginBottom: 16 },
  instructions: { color: '#ABB2BF', fontSize: 16, textAlign: 'center', marginBottom: 24, lineHeight: 24 },
  videoContainer: { width: '100%', aspectRatio: 3 / 4, maxWidth: 480, position: 'relative', overflow: 'hidden', borderRadius: 16 },
  ovalGuide: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', pointerEvents: 'none' },
  ovalBorder: { width: 200, height: 260, borderRadius: 130, borderWidth: 3, borderColor: 'rgba(97,175,239,0.6)', borderStyle: 'dashed' },
  countdownOverlay: { position: 'absolute', top: 16, right: 16, flexDirection: 'row', alignItems: 'center' },
  recordingDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#EF4444', marginRight: 8 },
  countdownText: { color: '#fff', fontSize: 20, fontWeight: '700' },
  startRow: { position: 'absolute', bottom: 24, left: 0, right: 0, alignItems: 'center' },
  uploadingContainer: { alignItems: 'center', padding: 32 },
  uploadingText: { color: '#fff', marginTop: 16, fontSize: 16 },
  completeContainer: { alignItems: 'center', padding: 32 },
  completeText: { color: '#98C379', fontSize: 20, fontWeight: '600' },
  errorRow: { padding: 16 },
  errorText: { color: '#E06C75', fontSize: 14, textAlign: 'center' },
});

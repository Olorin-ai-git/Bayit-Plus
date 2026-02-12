import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    zIndex: 100,
  },
  promptCard: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 20,
    padding: 28,
    width: '100%',
    maxWidth: 480,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  promptHebrew: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  promptTranslit: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    marginBottom: 4,
  },
  promptTranslation: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.35)',
    textAlign: 'center',
  },
  micContainer: {
    marginTop: 24,
    alignItems: 'center',
  },
  countdown: {
    fontSize: 48,
    fontWeight: '800',
    color: '#FF9F0A',
    marginBottom: 12,
  },
  micButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,59,48,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,59,48,0.6)',
  },
  micButtonActive: {
    backgroundColor: 'rgba(255,59,48,0.5)',
    borderColor: '#FF3B30',
  },
  attemptText: {
    color: 'rgba(255,255,255,0.4)',
    marginTop: 8,
    fontSize: 12,
  },
  hintText: {
    fontSize: 14,
    color: '#FF9F0A',
    marginTop: 12,
    textAlign: 'center',
  },
});

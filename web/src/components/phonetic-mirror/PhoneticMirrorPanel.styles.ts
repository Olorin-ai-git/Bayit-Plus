import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    alignItems: 'center',
  },
  phraseCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 20,
    padding: 28,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  phraseHebrew: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  phraseTransliteration: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    marginBottom: 4,
  },
  phraseTranslation: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center',
  },
  recordButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,59,48,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 32,
    borderWidth: 2,
    borderColor: 'rgba(255,59,48,0.6)',
  },
  recordButtonActive: {
    backgroundColor: 'rgba(255,59,48,0.5)',
    borderColor: '#FF3B30',
  },
  scoreDisplay: {
    marginTop: 24,
    alignItems: 'center',
  },
  scoreText: {
    fontSize: 48,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  qualityBadge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 12,
    marginTop: 8,
  },
  qualityText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

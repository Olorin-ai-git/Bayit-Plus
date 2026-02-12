/**
 * PhoneticMirrorScreen styles - Extracted for 200-line limit compliance.
 */
import { StyleSheet } from 'react-native';
import { Colors } from '../theme/colors';

export const QUALITY_COLORS: Record<string, string> = {
  excellent: Colors.Success.default,
  good: Colors.Success.s400,
  fair: Colors.Warning.default,
  needs_practice: Colors.Warning.w600,
  no_match: Colors.Error.default,
};

export function getWordColor(score: number): string {
  if (score >= 0.9) return Colors.Success.default;
  if (score >= 0.7) return Colors.Success.s400;
  if (score >= 0.5) return Colors.Warning.default;
  return Colors.Error.default;
}

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.Background.elevated,
    padding: 20,
    alignItems: 'center',
  },
  phraseCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
    padding: 28,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  phraseHebrew: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.Text.primary,
    marginBottom: 8,
  },
  translit: {
    fontSize: 18,
    color: Colors.Text.secondary,
  },
  translation: {
    fontSize: 14,
    color: Colors.Text.muted,
  },
  micBtn: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 32,
    borderWidth: 2,
    borderColor: 'rgba(239, 68, 68, 0.6)',
  },
  micBtnActive: {
    backgroundColor: 'rgba(239, 68, 68, 0.5)',
    borderColor: Colors.Error.default,
  },
  feedbackContainer: {
    alignItems: 'center',
    width: '100%',
    marginTop: 16,
  },
  scoreText: {
    fontSize: 48,
    fontWeight: '800',
    color: Colors.Text.primary,
  },
  qualityBadge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 12,
    marginTop: 8,
    marginBottom: 16,
  },
  qualityText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.Text.primary,
  },
  wordRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 6,
    width: '100%',
  },
  wordText: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.Text.primary,
  },
  wordScore: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  wordScoreText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.Text.primary,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  errorText: {
    color: Colors.Error.default,
    marginTop: 12,
    textAlign: 'center',
  },
});

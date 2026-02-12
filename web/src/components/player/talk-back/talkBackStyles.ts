/**
 * Talk Back Overlay Styles
 * Shared styles for Talk Back voice interaction components
 * Uses StyleSheet with glassmorphism patterns matching trivia overlay
 */

import { StyleSheet, TextStyle } from 'react-native';

const TV_MIN_FONT_SIZE = 29;
const TV_BODY_FONT_SIZE = 32;
const TV_HEADER_FONT_SIZE = 34;

interface TvTextStyles {
  headerText: TextStyle;
  questionText: TextStyle;
  characterName: TextStyle;
  scoreText: TextStyle;
  feedbackText: TextStyle;
}

export const getTvStyles = (isTV: boolean): TvTextStyles => ({
  headerText: isTV ? { fontSize: TV_HEADER_FONT_SIZE } : {},
  questionText: isTV ? { fontSize: TV_BODY_FONT_SIZE, lineHeight: 44 } : {},
  characterName: isTV ? { fontSize: TV_MIN_FONT_SIZE } : {},
  scoreText: isTV ? { fontSize: TV_HEADER_FONT_SIZE } : {},
  feedbackText: isTV ? { fontSize: TV_MIN_FONT_SIZE, lineHeight: 38 } : {},
});

export const talkBackStyles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    bottom: 120,
    right: 16,
    maxWidth: 380,
    zIndex: 100,
  },
  overlayRTL: {
    right: undefined,
    left: 16,
  },
  overlayTV: {
    maxWidth: 520,
    bottom: 160,
    right: 48,
  },
  glassCard: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(126, 34, 206, 0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
  },
  glassCardTV: {
    padding: 28,
    borderRadius: 20,
  },
  characterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 10,
  },
  characterRowRTL: {
    flexDirection: 'row-reverse',
  },
  characterAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(126, 34, 206, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  characterAvatarTV: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  characterName: {
    color: '#C084FC',
    fontSize: 14,
    fontWeight: '700',
  },
  questionBubble: {
    backgroundColor: 'rgba(126, 34, 206, 0.15)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(126, 34, 206, 0.2)',
  },
  questionText: {
    color: '#FFFFFF',
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '500',
  },
  questionTextRTL: {
    textAlign: 'right',
  },
  listeningContainer: {
    alignItems: 'center',
    paddingVertical: 16,
    gap: 12,
  },
  micIndicator: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(239, 68, 68, 0.6)',
  },
  micIndicatorTV: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  timerText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    fontWeight: '500',
  },
  evaluatingContainer: {
    alignItems: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  evaluatingText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    fontWeight: '500',
  },
  resultContainer: {
    gap: 12,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  scoreValue: {
    color: '#FCD34D',
    fontSize: 24,
    fontWeight: '800',
  },
  scoreLabel: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
    fontWeight: '500',
  },
  pointsEarned: {
    color: '#4ADE80',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  feedbackText: {
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  feedbackTextRTL: {
    textAlign: 'center',
  },
  starsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 4,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
  },
  actionsRowRTL: {
    flexDirection: 'row-reverse',
  },
});

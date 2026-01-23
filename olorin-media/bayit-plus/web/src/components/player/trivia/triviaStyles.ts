/**
 * Trivia Overlay Styles
 * Shared styles for trivia components with tvOS 10-foot UI support
 */

import { StyleSheet, TextStyle } from 'react-native'

// tvOS requires minimum 29pt font size for 10-foot UI
// All TV font sizes must be >= 29pt per Apple HIG
const TV_MIN_FONT_SIZE = 29
const TV_BODY_FONT_SIZE = 32
const TV_HEADER_FONT_SIZE = 29

interface TvTextStyles {
  headerText: TextStyle
  categoryText: TextStyle
  factText: TextStyle
  relatedPersonText: TextStyle
}

export const getTvStyles = (isTV: boolean): TvTextStyles => ({
  headerText: isTV ? { fontSize: TV_HEADER_FONT_SIZE } : {},
  categoryText: isTV ? { fontSize: TV_MIN_FONT_SIZE } : {},
  factText: isTV ? { fontSize: TV_BODY_FONT_SIZE, lineHeight: 42 } : {},
  relatedPersonText: isTV ? { fontSize: TV_MIN_FONT_SIZE } : {},
})

export const triviaStyles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 120, // Increased from 80 for subtitle clearance
    left: 16,
    maxWidth: 320,
    zIndex: 100,
  },
  containerRTL: {
    left: undefined,
    right: 16,
  },
  containerTV: {
    maxWidth: 480,
    bottom: 160,
    left: 48,
  },
  glassCard: {
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  glassCardTV: {
    padding: 24,
    borderRadius: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerRTL: {
    flexDirection: 'row-reverse',
  },
  iconContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  iconContainerRTL: {
    flexDirection: 'row-reverse',
  },
  headerText: {
    color: '#FCD34D',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dismissButton: {
    minWidth: 44,
    minHeight: 44,
    padding: 8,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(96, 165, 250, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: 8,
  },
  categoryBadgeRTL: {
    alignSelf: 'flex-end',
  },
  categoryText: {
    color: '#60A5FA',
    fontSize: 10,
    fontWeight: '500',
  },
  factText: {
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  factTextRTL: {
    textAlign: 'right',
  },
  relatedPerson: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  relatedPersonRTL: {
    flexDirection: 'row-reverse',
  },
  relatedPersonText: {
    color: '#60A5FA',
    fontSize: 12,
  },
  progressContainer: {
    marginTop: 4,
  },
  progressBar: {
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 1,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FCD34D',
    borderRadius: 1,
    width: '100%',
  },
})

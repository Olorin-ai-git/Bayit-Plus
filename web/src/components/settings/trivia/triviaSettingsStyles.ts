/**
 * Trivia Settings Styles
 * Shared styles for trivia settings components with tvOS support
 */

import { StyleSheet, TextStyle, ViewStyle } from 'react-native'

// tvOS requires minimum 29pt font size for 10-foot UI
// All TV font sizes must be >= 29pt per Apple HIG
const TV_MIN_FONT_SIZE = 29
const TV_BODY_FONT_SIZE = 32

interface TvStyles {
  text: TextStyle
  smallText: TextStyle
}

export const getTvStyles = (isTV: boolean): TvStyles => ({
  text: isTV ? { fontSize: TV_BODY_FONT_SIZE } : {},
  smallText: isTV ? { fontSize: TV_MIN_FONT_SIZE } : {},
})

export const triviaSettingsStyles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerRTL: {
    flexDirection: 'row-reverse',
  },
  headerIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIconRTL: {
    flexDirection: 'row-reverse',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 44, // iOS touch target minimum
  },
  settingRowRTL: {
    flexDirection: 'row-reverse',
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingLabel: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 2,
  },
  settingDescription: {
    color: '#9CA3AF',
    fontSize: 12,
  },
  textRTL: {
    textAlign: 'right',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginVertical: 16,
  },
  settingSection: {
    gap: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionHeaderRTL: {
    flexDirection: 'row-reverse',
  },
  sectionTitle: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  optionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  // Legacy styles kept for backwards compatibility
  option: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionActive: {
    backgroundColor: '#3B82F6',
  },
  optionText: {
    color: '#9CA3AF',
    fontSize: 14,
    fontWeight: '500',
  },
  optionTextActive: {
    color: '#FFFFFF',
  },
  categoryOption: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'transparent',
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryOptionActive: {
    backgroundColor: 'rgba(252, 211, 77, 0.2)',
    borderColor: '#FCD34D',
  },
  categoryOptionText: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '500',
  },
  categoryOptionTextActive: {
    color: '#FCD34D',
  },
  durationOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    minWidth: 48,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
})

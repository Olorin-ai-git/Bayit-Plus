/**
 * Styles for AI Recommendations Screen - tvOS Platform
 *
 * 10-foot UI optimized typography and spacing.
 * Layout, input, and button styles.
 */

import { StyleSheet } from 'react-native';
import { colors, spacing } from '@olorin/design-tokens';
import { resultStyles } from './AIRecommendationsResults.styles';

const layoutStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    paddingHorizontal: spacing[12],
  },
  header: {
    paddingTop: spacing[12],
    paddingBottom: spacing[6],
  },
  title: {
    fontSize: 54,
    fontWeight: 'bold',
    color: colors.white,
    marginBottom: spacing[4],
  },
  subtitle: {
    fontSize: 32,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  contentTypeSection: {
    marginBottom: spacing[6],
  },
  sectionLabel: {
    fontSize: 30,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: spacing[4],
  },
  contentTypeRow: {
    gap: spacing[4],
  },
  contentTypeButton: {
    paddingHorizontal: spacing[6],
    paddingVertical: spacing[4],
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    borderWidth: 3,
    borderColor: 'transparent',
  },
  contentTypeButtonActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  contentTypeButtonFocused: {
    transform: [{ scale: 1.05 }],
    borderColor: '#60A5FA',
  },
  contentTypeText: {
    fontSize: 28,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.6)',
  },
  contentTypeTextActive: {
    color: colors.white,
  },
  contextSection: {
    marginBottom: spacing[6],
  },
  contextInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 16,
    paddingHorizontal: spacing[6],
    paddingVertical: spacing[6],
    color: colors.white,
    fontSize: 36,
    marginBottom: spacing[4],
  },
  suggestionsRow: {
    gap: spacing[3],
  },
  suggestionChip: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 999,
  },
  suggestionChipFocused: {
    transform: [{ scale: 1.05 }],
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  suggestionChipText: {
    fontSize: 24,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  getButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: spacing[6],
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: spacing[4],
  },
  getButtonDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  getButtonFocused: {
    transform: [{ scale: 1.05 }],
    backgroundColor: '#60A5FA',
  },
  getButtonText: {
    color: colors.white,
    fontSize: 32,
    fontWeight: '600',
  },
  costInfo: {
    alignItems: 'center',
    marginBottom: spacing[6],
  },
  costInfoText: {
    fontSize: 28,
    color: 'rgba(255, 255, 255, 0.6)',
  },
});

export const styles = { ...layoutStyles, ...resultStyles };

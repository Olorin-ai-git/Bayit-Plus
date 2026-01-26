/**
 * Shared styles for TV voice components
 */

import { StyleSheet } from 'react-native';

const PURPLE = '#A855F7';
const WHITE = '#FFFFFF';
const GRAY = '#9CA3AF';
const RED = '#EF4444';
const GREEN = '#10B981';

export const voiceComponentStyles = StyleSheet.create({
  // Common button styles
  focusableButton: {
    borderRadius: 12,
    borderWidth: 4,
    minHeight: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: `rgba(168, 85, 247, 0.3)`,
    borderColor: `rgba(168, 85, 247, 0.2)`,
  },
  primaryButtonText: {
    fontSize: 28,
    fontWeight: '700',
    color: PURPLE,
  },
  secondaryButton: {
    backgroundColor: `rgba(107, 33, 168, 0.1)`,
    borderColor: `rgba(107, 33, 168, 0.2)`,
  },
  secondaryButtonText: {
    fontSize: 28,
    fontWeight: '700',
    color: GRAY,
  },
  // Common title styles
  title: {
    fontSize: 48,
    fontWeight: '700',
    color: PURPLE,
  },
  subtitle: {
    fontSize: 28,
    fontWeight: '600',
    color: WHITE,
  },
  body: {
    fontSize: 24,
    fontWeight: '500',
    color: WHITE,
  },
  // Common container styles
  glassContainer: {
    backgroundColor: `rgba(168, 85, 247, 0.1)`,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: `rgba(168, 85, 247, 0.3)`,
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
});

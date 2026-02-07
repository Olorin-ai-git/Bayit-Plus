/**
 * Styles for CreditBalanceWidget component (tvOS)
 * Extracted from CreditBalanceWidget.tsx for file size compliance
 */

import { StyleSheet } from 'react-native';
import { colors, spacing } from '@olorin/design-tokens';

// TV focus configuration
export const TV_FOCUS_SCALE = 1.1;
export const TV_FOCUS_BORDER_WIDTH = 4;
export const TV_FOCUS_BORDER_COLOR = '#A855F7';

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing[8],
    paddingVertical: spacing[6],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[6],
  },
  labelText: {
    color: colors.white,
    fontSize: 28,
    fontWeight: '600',
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  statusGreen: {
    backgroundColor: '#10B981',
  },
  statusAmber: {
    backgroundColor: '#F59E0B',
  },
  statusRed: {
    backgroundColor: '#EF4444',
  },
  statusGray: {
    backgroundColor: '#6B7280',
  },
  creditDisplay: {
    marginBottom: spacing[4],
  },
  creditRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing[3],
  },
  creditAmount: {
    color: colors.white,
    fontSize: 48,
    fontWeight: 'bold',
  },
  creditTotal: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 24,
  },
  progressBarContainer: {
    width: '100%',
    height: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 6,
    overflow: 'hidden',
    marginTop: spacing[4],
    marginBottom: spacing[6],
  },
  progressBar: {
    height: '100%',
    borderRadius: 6,
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingHorizontal: spacing[6],
    paddingVertical: spacing[4],
    borderRadius: 12,
    marginBottom: spacing[6],
  },
  warningCritical: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
  },
  warningLow: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
  },
  warningText: {
    fontSize: 24,
    fontWeight: '600',
  },
  warningTextCritical: {
    color: '#FCA5A5',
  },
  warningTextLow: {
    color: '#FCD34D',
  },
  upgradeButtonContainer: {
    marginTop: spacing[4],
  },
  upgradeButton: {
    backgroundColor: '#A855F7',
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[6],
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  upgradeButtonFocused: {
    borderWidth: TV_FOCUS_BORDER_WIDTH,
    borderColor: TV_FOCUS_BORDER_COLOR,
  },
  upgradeButtonText: {
    color: colors.white,
    fontSize: 28,
    fontWeight: '600',
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing[8],
  },
  loadingText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 24,
    marginTop: spacing[4],
  },
  errorContainer: {
    paddingVertical: spacing[8],
  },
  errorText: {
    color: '#F87171',
    fontSize: 24,
  },
});

export default styles;

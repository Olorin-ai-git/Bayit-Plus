/**
 * MyRecordingsPage StyleSheet
 */

import { StyleSheet } from 'react-native'
import { colors } from '@olorin/design-tokens'

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d0d1a',
  },
  header: {
    padding: 24,
    gap: 16,
    alignItems: 'center',
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  quotaContainer: {
    marginHorizontal: 24,
    marginBottom: 16,
    padding: 16,
    borderRadius: 8,
  },
  quotaHeader: {
    gap: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  quotaTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  quotaStats: {
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  quotaUsage: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  quotaPercentage: {
    fontSize: 16,
    fontWeight: '500',
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: 'rgba(75, 85, 99, 0.2)',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 16,
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  quotaFooter: {
    justifyContent: 'space-between',
  },
  quotaFooterText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  listContent: {
    padding: 16,
  },
  columnWrapper: {
    gap: 16,
  },
  pagination: {
    padding: 16,
    gap: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paginationButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(168, 85, 247, 0.2)',
    borderRadius: 8,
  },
  paginationButtonDisabled: {
    opacity: 0.3,
  },
  paginationButtonText: {
    color: colors.primary.DEFAULT,
    fontWeight: '600',
  },
  paginationText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
})

/**
 * EPGRecordModal StyleSheet
 * Styles for the modal container, program info, toggles, and action buttons.
 * Language grid, series scope, and storage styles live in their sub-components.
 */

import { StyleSheet } from 'react-native'
import { colors, spacing, borderRadius } from '@olorin/design-tokens'

export const styles = StyleSheet.create({
  section: { marginBottom: spacing.lg },
  programTitle: {
    fontSize: 18, fontWeight: '600', color: colors.text, marginBottom: spacing.sm,
  },
  programMeta: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.xs,
  },
  metaLabel: { fontSize: 14, fontWeight: '500', color: colors.textMuted },
  metaValue: { fontSize: 14, color: colors.textSecondary },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  timeText: { fontSize: 14, color: colors.textMuted },
  timeDivider: { fontSize: 14, color: colors.textMuted, opacity: 0.5 },
  toggleRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: spacing.md,
  },
  toggleLabelRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  toggleLabel: { fontSize: 16, fontWeight: '500', color: colors.text },
  actions: { flexDirection: 'row', gap: spacing.md },
  button: {
    flex: 1, paddingVertical: spacing.md,
    borderRadius: borderRadius.lg, alignItems: 'center', justifyContent: 'center',
  },
  buttonPressed: { opacity: 0.8 },
  buttonDisabled: { opacity: 0.5 },
  cancelButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  cancelButtonText: { fontSize: 14, fontWeight: '600', color: colors.text },
  confirmButton: { backgroundColor: colors.primary.DEFAULT },
  confirmButtonText: { fontSize: 14, fontWeight: '600', color: colors.text },
})

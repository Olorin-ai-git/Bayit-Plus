import { StyleSheet } from 'react-native';
import { colors, spacing, borderRadius, fontSizeTV } from '@olorin/design-tokens';

const TV_GRID_COLUMNS = 4;

export const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d0d1a' },
  quotaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: 60, paddingVertical: spacing.md },
  quotaText: { fontSize: fontSizeTV.sm, color: colors.textSecondary },
  quotaBar: { flex: 1, height: 4, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 2, overflow: 'hidden', maxWidth: 300 },
  quotaFill: { height: '100%', borderRadius: 2 },
  filterRow: { flexDirection: 'row', gap: spacing.md, paddingHorizontal: 60, paddingBottom: spacing.lg },
  filterButton: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: borderRadius.full, backgroundColor: 'rgba(255,255,255,0.06)' },
  filterButtonActive: { backgroundColor: 'rgba(168,85,247,0.25)' },
  filterText: { fontSize: fontSizeTV.base, color: colors.textSecondary },
  filterTextActive: { color: colors.text, fontWeight: '600' },
  gridContent: { paddingHorizontal: 60, paddingBottom: 60 },
  gridRow: { gap: spacing.lg, marginBottom: spacing.lg },
  card: { flex: 1, maxWidth: `${100 / TV_GRID_COLUMNS}%`, borderRadius: borderRadius.lg, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.04)', position: 'relative' },
  cardFocused: { transform: [{ scale: 1.05 }], shadowColor: '#a855f7', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 20, zIndex: 10 },
  thumbnailContainer: { width: '100%', height: 140, position: 'relative' },
  thumbnail: { width: '100%', height: '100%' },
  thumbnailPlaceholder: { width: '100%', height: '100%', backgroundColor: 'rgba(255,255,255,0.03)', justifyContent: 'center', alignItems: 'center' },
  durationOverlay: { position: 'absolute', bottom: 6, right: 6, backgroundColor: 'rgba(0,0,0,0.75)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  durationText: { color: '#fff', fontSize: fontSizeTV.xs, fontWeight: '600' },
  cardInfo: { padding: spacing.md },
  cardTitle: { fontSize: fontSizeTV.base, fontWeight: '600', color: colors.text, marginBottom: 6 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6 },
  cardMetaText: { fontSize: fontSizeTV.xs, color: colors.textMuted },
  badgeRow: { flexDirection: 'row', gap: 4 },
  tvBadge: { backgroundColor: 'rgba(255,255,255,0.08)', padding: 6, borderRadius: 6 },
  focusRing: { position: 'absolute', top: -2, left: -2, right: -2, bottom: -2, borderWidth: 3, borderColor: '#a855f7', borderRadius: borderRadius.lg + 2 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.lg },
  emptyTitle: { fontSize: fontSizeTV.xl, fontWeight: '600', color: colors.text },
  emptySubtitle: { fontSize: fontSizeTV.base, color: colors.textSecondary, textAlign: 'center', maxWidth: 400 },
});

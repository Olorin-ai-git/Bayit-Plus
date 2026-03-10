import { StyleSheet } from "react-native";
import { colors, spacing, borderRadius } from "@olorin/design-tokens";

export const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingBottom: spacing.xl },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.xl,
  },
  errorText: { fontSize: 16, color: colors.error },
  heroCard: { margin: spacing.md, padding: spacing.lg },
  heroHeader: {
    alignItems: "center",
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.lg,
    backgroundColor: "rgba(107, 33, 168, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  heroMeta: { flex: 1, gap: spacing.xs },
  tagline: { fontSize: 16, color: colors.textSecondary, lineHeight: 22 },
  description: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  platformRow: {
    flexDirection: "row",
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  platformLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: "600",
  },
  platformList: { fontSize: 12, color: colors.text },
  prereqSection: { marginTop: spacing.md },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing.sm,
  },
  prereqRow: {
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.xs,
  },
  prereqText: { fontSize: 13, color: colors.textSecondary, flex: 1 },
  actions: {
    flexDirection: "row",
    justifyContent: "center",
    gap: spacing.md,
    padding: spacing.lg,
  },
});

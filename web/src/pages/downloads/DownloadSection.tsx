import { View, Text, FlatList, StyleSheet } from "react-native";
import { colors, spacing, fontSize } from "@olorin/design-tokens";
import { DownloadCard } from "./DownloadCard";
import type { DownloadItem } from "@/stores/downloadStore";

interface DownloadSectionProps {
  title: string;
  items: DownloadItem[];
  numColumns: number;
  action?: React.ReactNode;
}

export function DownloadSection({
  title,
  items,
  numColumns,
  action,
}: DownloadSectionProps) {
  if (items.length === 0) return null;

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>
          {title} ({items.length})
        </Text>
        {action}
      </View>
      <FlatList
        data={items}
        keyExtractor={(item: DownloadItem) => item.id}
        numColumns={numColumns}
        key={`${title}-${numColumns}`}
        contentContainerStyle={{ gap: spacing.md }}
        columnWrapperStyle={numColumns > 1 ? { gap: spacing.md } : undefined}
        renderItem={({ item }: { item: DownloadItem }) => (
          <View style={{ flex: 1, maxWidth: `${100 / numColumns}%` }}>
            <DownloadCard item={item} />
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: spacing.xl },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: "600",
  },
});

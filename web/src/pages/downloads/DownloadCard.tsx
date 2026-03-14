import { useState } from "react";
import { View, Text, Image, Pressable, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import { Play, Trash2, Pause, RotateCcw, Download } from "lucide-react";
import { GlassCard, GlassLoadingSpinner } from "@bayit/shared/ui";
import { NativeIcon } from "@olorin/shared-icons/native";
import { colors, spacing, borderRadius, fontSize } from "@olorin/design-tokens";
import { useDownloadStore, type DownloadItem } from "@/stores/downloadStore";
import { useFullscreenPlayerStore } from "@/stores/fullscreenPlayerStore";

const TYPE_ICON_NAMES: Record<string, string> = {
  movie: "vod",
  series: "vod",
  episode: "vod",
  podcast: "podcasts",
};

interface DownloadCardProps {
  item: DownloadItem;
}

export function DownloadCard({ item }: DownloadCardProps) {
  const { i18n, t } = useTranslation();
  const [isHovered, setIsHovered] = useState(false);
  const { deleteDownload, pauseDownload, resumeDownload, playOffline } =
    useDownloadStore();
  const { openPlayer } = useFullscreenPlayerStore();

  const handlePlayOffline = async (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    const cid = item.content_id ?? item.id;
    const blobUrl = await playOffline(cid);
    if (blobUrl) {
      openPlayer({
        id: item.id,
        type: item.type as "vod",
        title: item.title,
        src: blobUrl,
      });
    }
  };

  const getLocalizedText = (field: "title" | "subtitle") => {
    const lang = i18n.language;
    if (lang === "he") return item[field] || item.title;
    if (lang === "es")
      return (
        item[`${field}_es` as keyof DownloadItem] ||
        item[`${field}_en` as keyof DownloadItem] ||
        item[field]
      );
    return item[`${field}_en` as keyof DownloadItem] || item[field];
  };

  const isDownloading = item.status === "downloading";
  const isPaused = item.status === "paused";
  const isFailed = item.status === "failed";
  const isCompleted = item.status === "completed";
  const route =
    item.type === "podcast" ? `/podcasts/${item.id}` : `/vod/${item.id}`;

  return (
    <Link
      to={isCompleted ? route : "#"}
      style={{ textDecoration: "none", flex: 1 }}
    >
      <Pressable
        onHoverIn={() => setIsHovered(true)}
        onHoverOut={() => setIsHovered(false)}
        style={[styles.cardPressable, isHovered && styles.cardPressableHovered]}
      >
        <GlassCard style={styles.cardContainer}>
          <View style={styles.thumbnailContainer}>
            {item.thumbnail ? (
              <Image
                source={{ uri: item.thumbnail }}
                style={styles.thumbnail}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.placeholderContainer}>
                <NativeIcon
                  name={TYPE_ICON_NAMES[item.type] || "discover"}
                  size="xl"
                  color={colors.textMuted}
                />
              </View>
            )}

            {isDownloading && item.progress !== undefined && (
              <View style={styles.progressBarContainer}>
                <View
                  style={[
                    styles.progressBarFill,
                    { width: `${item.progress}%` },
                  ]}
                />
              </View>
            )}

            <View style={styles.typeBadge}>
              <NativeIcon
                name={TYPE_ICON_NAMES[item.type] || "discover"}
                size="sm"
                color={colors.background}
              />
            </View>

            {item.size && (
              <View style={styles.sizeBadge}>
                <Text style={styles.sizeBadgeText}>{item.size}</Text>
              </View>
            )}

            {(isDownloading || isPaused) && (
              <View style={styles.statusOverlay}>
                {isDownloading && (
                  <>
                    <GlassLoadingSpinner size="large" />
                    <Text style={styles.progressText}>{item.progress}%</Text>
                  </>
                )}
                {isPaused && (
                  <Text style={styles.pausedText}>{t("downloads.paused")}</Text>
                )}
              </View>
            )}

            {isFailed && (
              <View style={styles.statusOverlay}>
                <Text style={styles.failedText}>{t("downloads.failed")}</Text>
              </View>
            )}

            {isCompleted && isHovered && (
              <Pressable
                onPress={handlePlayOffline}
                style={styles.hoverOverlay}
              >
                <View style={styles.playButton}>
                  <Play
                    size={24}
                    color={colors.background}
                    fill={colors.background}
                  />
                </View>
              </Pressable>
            )}
          </View>

          <View style={styles.contentContainer}>
            <Text style={styles.titleText} numberOfLines={1}>
              {getLocalizedText("title")}
            </Text>
            {item.subtitle && (
              <Text style={styles.subtitleText} numberOfLines={1}>
                {getLocalizedText("subtitle")}
              </Text>
            )}
          </View>

          {isHovered && (
            <View style={styles.actionRow}>
              {isDownloading && (
                <Pressable
                  onPress={(e) => {
                    e.stopPropagation();
                    pauseDownload(item.id);
                  }}
                  style={styles.actionButton}
                >
                  <Pause size={14} color={colors.text} />
                </Pressable>
              )}
              {isPaused && (
                <Pressable
                  onPress={(e) => {
                    e.stopPropagation();
                    resumeDownload(item.id);
                  }}
                  style={styles.actionButtonResume}
                >
                  <Download size={14} color={colors.text} />
                </Pressable>
              )}
              {isFailed && (
                <Pressable
                  onPress={(e) => {
                    e.stopPropagation();
                    resumeDownload(item.id);
                  }}
                  style={styles.actionButtonRetry}
                >
                  <RotateCcw size={14} color={colors.text} />
                </Pressable>
              )}
              <Pressable
                onPress={(e) => {
                  e.stopPropagation();
                  deleteDownload(item.id);
                }}
                style={styles.deleteButton}
              >
                <Trash2 size={14} color={colors.text} />
              </Pressable>
            </View>
          )}
        </GlassCard>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  cardPressable: { transform: [{ scale: 1 }] },
  cardPressableHovered: { transform: [{ scale: 1.05 }] },
  cardContainer: {
    padding: 0,
    margin: spacing.xs,
    overflow: "hidden",
    position: "relative",
  },
  thumbnailContainer: { aspectRatio: 16 / 9, position: "relative" },
  thumbnail: { width: "100%", height: "100%" },
  placeholderContainer: {
    width: "100%",
    height: "100%",
    backgroundColor: "rgba(255,255,255,0.05)",
    justifyContent: "center",
    alignItems: "center",
  },
  progressBarContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  progressBarFill: { height: "100%", backgroundColor: colors.primary.DEFAULT },
  typeBadge: {
    position: "absolute",
    top: spacing.sm,
    right: spacing.sm,
    backgroundColor: "rgba(0,0,0,0.7)",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.lg,
  },
  sizeBadge: {
    position: "absolute",
    top: spacing.sm,
    left: spacing.sm,
    backgroundColor: "rgba(168,85,247,0.9)",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.lg,
  },
  sizeBadgeText: {
    color: colors.background,
    fontSize: fontSize.xs,
    fontWeight: "700",
  },
  statusOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  progressText: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: "600",
    marginTop: spacing.sm,
  },
  pausedText: { color: "#EAB308", fontSize: fontSize.sm, fontWeight: "600" },
  failedText: { color: "#EF4444", fontSize: fontSize.sm, fontWeight: "600" },
  hoverOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  playButton: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary.DEFAULT,
    justifyContent: "center",
    alignItems: "center",
  },
  contentContainer: { padding: spacing.sm },
  titleText: { color: colors.text, fontSize: fontSize.base, fontWeight: "600" },
  subtitleText: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
  },
  actionRow: {
    position: "absolute",
    top: 40,
    left: spacing.sm,
    flexDirection: "row",
    gap: spacing.xs,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.full,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  actionButtonResume: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.full,
    backgroundColor: "rgba(34,197,94,0.8)",
    justifyContent: "center",
    alignItems: "center",
  },
  actionButtonRetry: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.full,
    backgroundColor: "rgba(234,179,8,0.8)",
    justifyContent: "center",
    alignItems: "center",
  },
  deleteButton: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.full,
    backgroundColor: "rgba(239,68,68,0.8)",
    justifyContent: "center",
    alignItems: "center",
  },
});

import { useEffect } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Download, RotateCcw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import {
  GlassPageHeader,
  GlassEmptyState,
  GlassButton,
} from "@bayit/shared/ui";
import { LoadingState } from "@bayit/shared-components/states";
import { colors, spacing, fontSize } from "@olorin/design-tokens";
import { useDirection } from "@/hooks/useDirection";
import { useResponsive } from "@/hooks/useResponsive";
import {
  useDownloadStore,
  selectActiveDownloads,
  selectCompletedDownloads,
  selectFailedDownloads,
} from "@/stores/downloadStore";
import { OfflineBanner } from "@/components/common/OfflineBanner";
import { StorageBar } from "./StorageBar";
import { DownloadSection } from "./DownloadSection";
import { useIncognitoDetect } from "@/hooks/useIncognitoDetect";

const isSafari = () =>
  typeof navigator !== "undefined" &&
  /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

export default function DownloadsPage() {
  const { t } = useTranslation();
  const { isRTL } = useDirection();
  const { width } = useResponsive();
  const navigate = useNavigate();
  const { loading, fetchDownloads, clearAll, startPolling, stopPolling } =
    useDownloadStore();
  const downloads = useDownloadStore((s) => s.downloads);
  const active = useDownloadStore(selectActiveDownloads);
  const completed = useDownloadStore(selectCompletedDownloads);
  const failed = useDownloadStore(selectFailedDownloads);
  const { isIncognito } = useIncognitoDetect();

  const numColumns =
    width >= 1280
      ? 6
      : width >= 1024
        ? 5
        : width >= 768
          ? 4
          : width >= 640
            ? 3
            : 2;

  useEffect(() => {
    fetchDownloads();
  }, [fetchDownloads]);

  useEffect(() => {
    if (active.length > 0) {
      startPolling(5000);
    } else {
      stopPolling();
    }
    return () => stopPolling();
  }, [active.length, startPolling, stopPolling]);

  const retryAllFailed = () => {
    failed.forEach((d) => useDownloadStore.getState().resumeDownload(d.id));
  };

  return (
    <View style={styles.container}>
      <GlassPageHeader
        title={t("downloads.title")}
        pageType="downloads"
        badge={downloads.length}
        isRTL={isRTL}
        action={
          downloads.length > 0 ? (
            <GlassButton
              onPress={clearAll}
              variant="ghost"
              size="sm"
              title={t("downloads.clearAll")}
            />
          ) : undefined
        }
      />

      <OfflineBanner />

      {isSafari() && (
        <View style={styles.warningBanner}>
          <Text style={styles.warningText}>{t("downloads.safariWarning")}</Text>
        </View>
      )}

      {isIncognito && (
        <View style={styles.warningBanner}>
          <Text style={styles.warningText}>
            {t("downloads.incognitoWarning")}
          </Text>
        </View>
      )}

      <StorageBar />

      {loading ? (
        <LoadingState
          message={t("downloads.loading")}
          spinnerColor={colors.primary}
        />
      ) : downloads.length > 0 ? (
        <>
          <DownloadSection
            title={t("downloads.downloading")}
            items={active}
            numColumns={numColumns}
          />
          <DownloadSection
            title={t("downloads.failed")}
            items={failed}
            numColumns={numColumns}
            action={
              failed.length > 0 ? (
                <Pressable
                  onPress={retryAllFailed}
                  style={styles.retryAllButton}
                >
                  <RotateCcw size={14} color={colors.primary.DEFAULT} />
                  <Text style={styles.retryAllText}>
                    {t("downloads.retryAll")}
                  </Text>
                </Pressable>
              ) : undefined
            }
          />
          <DownloadSection
            title={t("downloads.completed")}
            items={completed}
            numColumns={numColumns}
          />
        </>
      ) : (
        <GlassEmptyState
          variant="no-downloads"
          icon={
            <Download
              size={72}
              color="rgba(168,85,247,0.5)"
              strokeWidth={1.5}
            />
          }
          title={t("downloads.empty")}
          description={t("downloads.emptyHint")}
          action={
            <GlassButton
              onPress={() => navigate("/vod")}
              variant="primary"
              size="md"
              title={t("downloads.browseVod")}
              disabled={isIncognito}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
    maxWidth: 1400,
    marginHorizontal: "auto",
    width: "100%",
  },
  warningBanner: {
    backgroundColor: "rgba(234,179,8,0.15)",
    borderWidth: 1,
    borderColor: "rgba(234,179,8,0.4)",
    borderRadius: 8,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  warningText: {
    color: "#EAB308",
    fontSize: fontSize.sm,
  },
  retryAllButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  retryAllText: {
    color: colors.primary.DEFAULT,
    fontSize: fontSize.sm,
    fontWeight: "500",
  },
});

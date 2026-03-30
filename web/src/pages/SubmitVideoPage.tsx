import { useState, useEffect, useRef, useCallback } from "react";
import { Text, ScrollView, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useDirection } from "@/hooks/useDirection";
import { colors, spacing, borderRadius, fontSize } from "@olorin/design-tokens";
import { GlassView, GlassPageHeader, GlassEmptyState } from "@bayit/shared/ui";
import { Film, Upload } from "lucide-react";
import { submissionService } from "@bayit/shared-services/api/submissionServices";
import type {
  SubmissionListItem,
  SubmissionStatus,
} from "@bayit/shared-services/api/submissionServices";
import { SubmitUrlForm } from "@/components/submit/SubmitUrlForm";
import { SubmissionStatusView } from "@/components/submit/SubmissionStatusView";
import { PastSubmissionsList } from "@/components/submit/PastSubmissionsList";
import { logger } from "@/utils/logger";

const POLL_INTERVAL_MS = 3000;
type PageState = "input" | "processing" | "ready" | "error";

export default function SubmitVideoPage() {
  const { t } = useTranslation();
  const { isRTL, textAlign } = useDirection();
  const navigate = useNavigate();

  const [pageState, setPageState] = useState<PageState>("input");
  const [submitting, setSubmitting] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<SubmissionStatus | null>(
    null,
  );
  const [submissions, setSubmissions] = useState<SubmissionListItem[]>([]);
  const [errorMessage, setErrorMessage] = useState("");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  useEffect(() => {
    loadSubmissions();
    return stopPolling;
  }, [stopPolling]);

  const loadSubmissions = async () => {
    try {
      setSubmissions((await submissionService.listSubmissions()).data);
    } catch (err) {
      logger.error("Failed to load submissions", "SubmitVideoPage", err);
    }
  };

  const startPolling = (jobId: string) => {
    stopPolling();
    pollRef.current = setInterval(async () => {
      try {
        const res = await submissionService.getStatus(jobId);
        setCurrentStatus(res.data);
        if (res.data.status === "ready" || res.data.status === "failed") {
          setPageState(res.data.status === "ready" ? "ready" : "error");
          if (res.data.status === "failed")
            setErrorMessage(res.data.error || t("submitVideo.failed"));
          stopPolling();
          loadSubmissions();
        }
      } catch (err) {
        logger.error("Poll failed", "SubmitVideoPage", err);
      }
    }, POLL_INTERVAL_MS);
  };

  const handleSubmit = async (url: string) => {
    setSubmitting(true);
    setErrorMessage("");
    try {
      const res = await submissionService.submitUrl(url);
      setCurrentStatus({
        job_id: res.data.job_id,
        status: "pending",
        content_id: null,
        video_title: null,
        character_count: 0,
        error: null,
      });
      setPageState("processing");
      startPolling(res.data.job_id);
    } catch (err: unknown) {
      setPageState("error");
      const detail =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { detail?: string } } }).response
              ?.data?.detail
          : undefined;
      setErrorMessage(detail || t("submitVideo.failed"));
      logger.error("Submit failed", "SubmitVideoPage", err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setPageState("input");
    setCurrentStatus(null);
    setErrorMessage("");
    stopPolling();
  };
  const navigateToWatch = (contentId: string) =>
    navigate(`/zeh-ani/movie-interactions/${contentId}`);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <GlassPageHeader
        title={t("submitVideo.title")}
        pageType="submit"
        isRTL={isRTL}
      />
      <GlassView style={styles.header}>
        <Upload size={48} color={colors.primary.DEFAULT} />
        <Text style={[styles.description, { textAlign }]}>
          {t("submitVideo.description")}
        </Text>
      </GlassView>

      {pageState === "input" && (
        <SubmitUrlForm onSubmit={handleSubmit} submitting={submitting} />
      )}

      {currentStatus && pageState !== "input" && (
        <SubmissionStatusView
          status={currentStatus}
          pageState={pageState as "processing" | "ready" | "error"}
          errorMessage={errorMessage}
          onReset={handleReset}
          onNavigateToWatch={navigateToWatch}
        />
      )}

      <PastSubmissionsList
        submissions={submissions}
        onNavigateToWatch={navigateToWatch}
      />

      {submissions.length === 0 && pageState === "input" && (
        <GlassView style={styles.empty}>
          <GlassEmptyState
            icon={<Film size={48} color={colors.textMuted} />}
            title={t("submitVideo.noSubmissions")}
            description={t("submitVideo.noSubmissionsDesc")}
          />
        </GlassView>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xl * 2 },
  header: {
    padding: spacing.xl,
    borderRadius: borderRadius.xl,
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  description: {
    fontSize: fontSize.base,
    color: colors.textMuted,
    lineHeight: fontSize.base * 1.6,
    marginTop: spacing.md,
  },
  empty: { marginTop: spacing.xl },
});

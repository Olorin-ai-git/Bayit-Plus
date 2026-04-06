/**
 * ComprehensionErrorBanner — Phase 2 DEMO-02 (UI-SPEC §6.10)
 *
 * Graceful-degrade banner shown when the scoring/qgen call fails or
 * exceeds the 8s client timeout. The session stays open — the student
 * can tap the Keep Watching CTA to resume playback. There is NO
 * auto-dismiss: the component never calls onKeepWatching from a timer.
 *
 * Gates:
 *   - DEMO-04: @bayit/glass primitives only (GlassErrorBanner wrapper).
 *   - D-14: never reads score/rationale.
 *   - D-17: no re-start affordance.
 *   - UI-SPEC §6.10: warning severity, inline banner, no modal.
 */

import React from "react";
import { useTranslation } from "react-i18next";
import { GlassErrorBanner } from "@bayit/glass";

export interface ComprehensionErrorBannerProps {
  onKeepWatching: () => void;
}

const ComprehensionErrorBanner: React.FC<ComprehensionErrorBannerProps> = ({
  onKeepWatching,
}) => {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-2 p-4" role="alert" aria-live="polite">
      <GlassErrorBanner
        message={t("comprehension.error")}
        onDismiss={onKeepWatching}
        accessibilityLabel={t("comprehension.error")}
      />
      <span className="text-sm font-normal leading-normal">
        {t("comprehension.resume_playback")}
      </span>
    </div>
  );
};

export default ComprehensionErrorBanner;

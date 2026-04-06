/**
 * ComprehensionPendingState — Phase 2 DEMO-02 (UI-SPEC §6.5)
 *
 * Scoring-latency state. The character bubble does NOT disappear
 * while the backend scores + generates the next turn; a spinner +
 * loading caption appears in the bubble footer. Wraps
 * ComprehensionQuestionBubble with showRetryAttribution=false to reuse
 * the identical visual treatment.
 *
 * Gates:
 *   - DEMO-04: @bayit/glass primitives only; the spinner is a
 *     CSS-only div with Tailwind animate-spin (no third-party UI).
 *   - D-14: no score/rationale rendering.
 */

import React from "react";
import { useTranslation } from "react-i18next";
import ComprehensionQuestionBubble from "./ComprehensionQuestionBubble";

export interface ComprehensionPendingStateProps {
  characterName: string;
  characterFrameUrl: string;
  questionText: string;
}

const ComprehensionPendingState: React.FC<ComprehensionPendingStateProps> = ({
  characterName,
  characterFrameUrl,
  questionText,
}) => {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-2">
      <ComprehensionQuestionBubble
        characterName={characterName}
        characterFrameUrl={characterFrameUrl}
        questionText={questionText}
        inCharacterPhrasing=""
        showRetryAttribution={false}
      />
      <div
        className="flex items-center gap-2 p-2"
        role="status"
        aria-live="polite"
      >
        <div
          className="w-4 h-4 rounded-full border-2 border-glass-border animate-spin"
          style={{ borderTopColor: "currentColor" }}
          aria-hidden="true"
        />
        <span className="text-sm font-normal leading-normal">
          {t("comprehension.loading")}
        </span>
      </div>
    </div>
  );
};

export default ComprehensionPendingState;

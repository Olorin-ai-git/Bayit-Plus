/**
 * ComprehensionQuestionBubble — Phase 2 DEMO-02
 *
 * Character question bubble. Same component is used for the initial turn
 * AND the simpler-retry turn — only the attribution line differs
 * (UI-SPEC §6.6). Visual treatment mirrors InteractiveMomentPrompt:
 * circular character frame, name at 20/600, body prose at 16/400.
 *
 * Gates:
 *   - DEMO-04: @bayit/glass primitives only; div/span/h3/p/img wrapping.
 *   - D-14: renders only follow_up.in_character_phrasing / question_text
 *     (passed in via props). Never touches score/rationale.
 *   - D-17: no re-start affordance.
 *   - UI-SPEC §2/§3: only the 4 typography sizes x 2 weights, only the
 *     8-point spacing tokens.
 */

import React from "react";
import { useTranslation } from "react-i18next";
import { GlassCard } from "@bayit/glass";

export interface ComprehensionQuestionBubbleProps {
  characterName: string;
  characterFrameUrl: string;
  questionText: string;
  inCharacterPhrasing: string;
  showRetryAttribution: boolean;
}

const ComprehensionQuestionBubble: React.FC<
  ComprehensionQuestionBubbleProps
> = ({
  characterName,
  characterFrameUrl,
  questionText,
  inCharacterPhrasing,
  showRetryAttribution,
}) => {
  const { t } = useTranslation();
  const headingId = `comprehension-char-${characterName}`;
  const bodyText = inCharacterPhrasing || questionText;

  return (
    <GlassCard className="max-w-md p-6">
      <div
        className="flex flex-col gap-4"
        role="dialog"
        aria-labelledby={headingId}
      >
        {showRetryAttribution ? (
          <span className="text-sm font-normal leading-normal opacity-70">
            {t("comprehension.retry.prompt")}
          </span>
        ) : null}
        <div className="flex items-center gap-4">
          <img
            src={characterFrameUrl}
            alt={characterName}
            className="w-16 h-16 rounded-full object-cover"
          />
          <div className="flex flex-col gap-1">
            <h3 id={headingId} className="text-xl font-semibold leading-tight">
              {characterName}
            </h3>
            <span className="text-sm font-normal leading-normal opacity-70">
              {t("comprehension.toggle.label")}
            </span>
          </div>
        </div>
        <p className="text-base font-normal leading-relaxed break-words">
          {bodyText}
        </p>
      </div>
    </GlassCard>
  );
};

export default ComprehensionQuestionBubble;

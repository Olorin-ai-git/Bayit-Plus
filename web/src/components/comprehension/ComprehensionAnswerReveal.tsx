/**
 * ComprehensionAnswerReveal — Phase 2 DEMO-02 (D-13, UI-SPEC §6.6)
 *
 * Teach-not-scold two-line reveal that plays after a second wrong
 * answer. Character bubble + intro + revealed answer body + closing
 * line, all in the character's warm voice. Never flags "wrong" or
 * uses destructive styling (D-14 hard rule).
 *
 * Gates:
 *   - DEMO-04: @bayit/glass primitives only.
 *   - D-14: no score/rationale, no red/green/amber styling.
 *   - UI-SPEC §9: aria-live="polite" region so screen readers mirror
 *     the character's spoken reveal.
 */

import React from "react";
import { useTranslation } from "react-i18next";
import { GlassCard } from "@bayit/glass";

export interface ComprehensionAnswerRevealProps {
  characterName: string;
  characterFrameUrl: string;
  revealBody: string;
}

const ComprehensionAnswerReveal: React.FC<ComprehensionAnswerRevealProps> = ({
  characterName,
  characterFrameUrl,
  revealBody,
}) => {
  const { t } = useTranslation();
  const headingId = `comprehension-reveal-${characterName}`;

  return (
    <GlassCard className="max-w-md p-6">
      <div
        className="flex flex-col gap-4"
        role="dialog"
        aria-labelledby={headingId}
      >
        <div className="flex items-center gap-4">
          <img
            src={characterFrameUrl}
            alt={characterName}
            className="w-16 h-16 rounded-full object-cover"
          />
          <h3 id={headingId} className="text-xl font-semibold leading-tight">
            {characterName}
          </h3>
        </div>
        <div aria-live="polite" className="flex flex-col gap-2">
          <p className="text-base font-normal leading-relaxed break-words">
            {t("comprehension.answer_reveal.intro")}
          </p>
          <p className="text-base font-normal leading-relaxed break-words">
            {revealBody}
          </p>
          <p className="text-base font-normal leading-relaxed break-words">
            {t("comprehension.answer_reveal.closing")}
          </p>
        </div>
      </div>
    </GlassCard>
  );
};

export default ComprehensionAnswerReveal;

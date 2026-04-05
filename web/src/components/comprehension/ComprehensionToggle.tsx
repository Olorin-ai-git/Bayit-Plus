/**
 * ComprehensionToggle — Phase 2 DEMO-01
 *
 * Pill-style toggle that lives inside the player's settings surface
 * (UI-SPEC 6.1). Accent-purple when ON, glass-border when OFF. Wraps a
 * GlassToggle in a GlassTooltip and pairs it with a 14/400 subtitle
 * label. When the toggle flips ON, a 14/400 italic info hint is shown
 * for four seconds (once per session — self-dismisses and is not shown
 * again for the current key), then fades out.
 *
 * Gates:
 *   - DEMO-04: composed exclusively from @bayit/glass primitives. Uses
 *     div/span/p only (never button/input/select/textarea).
 *   - D-14: does not render any numeric grade or teacher-only copy.
 *   - D-17: does not render any "start over" affordance or text.
 */

import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { GlassToggle, GlassTooltip } from "@bayit/glass";
import {
  makeSessionKey,
  useComprehensionSessionStore,
} from "@/stores/comprehensionSessionStore";

const INFO_HINT_DURATION_MS = 4000;

export interface ComprehensionToggleProps {
  userId: string;
  profileId: string;
  contentId: string;
}

const ComprehensionToggle: React.FC<ComprehensionToggleProps> = ({
  userId,
  profileId,
  contentId,
}) => {
  const { t } = useTranslation();
  const sessionKey = makeSessionKey(userId, profileId, contentId);

  const isOn = useComprehensionSessionStore(
    (s) => s.toggleByKey[sessionKey] ?? false,
  );
  const setToggle = useComprehensionSessionStore((s) => s.setToggle);

  const [hintVisible, setHintVisible] = useState(false);
  const [hintSeen, setHintSeen] = useState(false);

  useEffect(() => {
    if (!hintVisible) {
      return;
    }
    const timeoutId = window.setTimeout(
      () => setHintVisible(false),
      INFO_HINT_DURATION_MS,
    );
    return () => window.clearTimeout(timeoutId);
  }, [hintVisible]);

  const handleChange = (next: boolean) => {
    setToggle(sessionKey, next);
    if (next && !hintSeen) {
      setHintVisible(true);
      setHintSeen(true);
    } else if (!next) {
      setHintVisible(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-4 p-4">
        <GlassTooltip content={t("comprehension.enable_desc")} position="top">
          <GlassToggle
            value={isOn}
            onValueChange={handleChange}
            size="medium"
            accessibilityLabel={t("comprehension.toggle.label")}
            accessibilityHint={t("comprehension.enable_desc")}
          />
        </GlassTooltip>
        <span className="text-sm font-normal">
          {t("comprehension.toggle.label")}
        </span>
      </div>
      {hintVisible ? (
        <p
          className="text-sm font-normal italic px-4 pb-2"
          role="status"
          aria-live="polite"
        >
          {t("comprehension.info_message")}
        </p>
      ) : null}
    </div>
  );
};

export default ComprehensionToggle;

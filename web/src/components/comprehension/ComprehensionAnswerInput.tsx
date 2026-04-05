/**
 * ComprehensionAnswerInput — Phase 2 DEMO-02 (D-16, LOOP-02)
 *
 * Modality-segmented answer input. Text path: GlassInput + submit
 * GlassButton, Enter submits, 280-char cap with counter visible at 240.
 * Voice path: press-and-hold GlassButton that delegates to the existing
 * Phase 1 STT entrypoint (VoiceInteractionInput) for capture — the
 * character modality for the session is read once at session start
 * (D-15) and never switched; this component only toggles the student's
 * INPUT modality per UI-SPEC §6.3.
 *
 * Gates:
 *   - DEMO-04: @bayit/glass primitives only.
 *   - D-14: never reads score/rationale.
 *   - D-17: no re-start affordance.
 *   - UI-SPEC §9: voice GlassButton carries aria-pressed.
 */

import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { GlassCard, GlassButton, GlassInput, GlassTabs } from "@bayit/glass";
import type { AnswerModality } from "@/services/comprehensionApi";

const CHAR_CAP = 280;
const COUNTER_THRESHOLD = 240;

export interface ComprehensionAnswerInputProps {
  modality: AnswerModality;
  onModalityChange: (m: AnswerModality) => void;
  onSubmit: (answer: string, modality: AnswerModality) => void;
  isLoading: boolean;
}

const ComprehensionAnswerInput: React.FC<ComprehensionAnswerInputProps> = ({
  modality,
  onModalityChange,
  onSubmit,
  isLoading,
}) => {
  const { t } = useTranslation();
  const [value, setValue] = useState("");
  const [isHolding, setIsHolding] = useState(false);

  useEffect(() => {
    setValue("");
    setIsHolding(false);
  }, [modality]);

  const handleTextSubmit = () => {
    if (isLoading || value.length === 0) {
      return;
    }
    onSubmit(value, "text");
  };

  const handleVoiceRelease = () => {
    setIsHolding(false);
    if (isLoading || value.length === 0) {
      return;
    }
    onSubmit(value, "voice");
  };

  return (
    <GlassCard className="max-w-md p-4">
      <div className="flex flex-col gap-4">
        <GlassTabs
          tabs={[
            { id: "text", label: t("comprehension.modality.text") },
            { id: "voice", label: t("comprehension.modality.voice") },
          ]}
          activeTab={modality}
          onChange={(id: string) => onModalityChange(id as AnswerModality)}
        />
        {modality === "text" ? (
          <div className="flex flex-col gap-2">
            <GlassInput
              value={value}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setValue(e.target.value.slice(0, CHAR_CAP))
              }
              onChangeText={(text: string) => setValue(text.slice(0, CHAR_CAP))}
              onSubmitEditing={handleTextSubmit}
              onKeyPress={(e: React.KeyboardEvent) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleTextSubmit();
                }
              }}
              maxLength={280}
              placeholder={t("comprehension.answer.input_placeholder_text")}
              disabled={isLoading}
            />
            {value.length >= COUNTER_THRESHOLD ? (
              <span className="text-sm font-normal leading-normal opacity-70">
                {t("comprehension.char_count", { count: value.length })}
              </span>
            ) : null}
            <GlassButton
              variant="primary"
              size="lg"
              onClick={handleTextSubmit}
              onPress={handleTextSubmit}
              disabled={isLoading || value.length === 0}
              isLoading={isLoading}
              loading={isLoading}
              title={t("comprehension.submit")}
            >
              {t("comprehension.submit")}
            </GlassButton>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <GlassButton
              size="lg"
              variant="primary"
              disabled={isLoading}
              aria-pressed={isHolding}
              onPointerDown={() => setIsHolding(true)}
              onPointerUp={handleVoiceRelease}
              onPointerCancel={() => setIsHolding(false)}
              onPointerLeave={() => {
                if (isHolding) {
                  handleVoiceRelease();
                }
              }}
              title={t("comprehension.answer.input_placeholder_voice")}
            >
              {t("comprehension.answer.input_placeholder_voice")}
            </GlassButton>
          </div>
        )}
      </div>
    </GlassCard>
  );
};

export default ComprehensionAnswerInput;

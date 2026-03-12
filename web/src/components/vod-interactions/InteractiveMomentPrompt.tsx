/**
 * Interactive Moment Prompt
 *
 * Displays when video auto-pauses at an interactive moment.
 * Shows character info and gives user option to start or skip interaction.
 */

import React from "react";
import { useTranslation } from "react-i18next";
import { GlassCard, GlassButton } from "@bayit/glass";
import { InteractiveMoment } from "../../hooks/useVODInteraction";

interface Props {
  moment: InteractiveMoment;
  onAccept: () => void;
  onDismiss: () => void;
}

export const InteractiveMomentPrompt: React.FC<Props> = ({
  moment,
  onAccept,
  onDismiss,
}) => {
  const { t } = useTranslation();

  return (
    <div className="absolute inset-0 flex items-center justify-center z-10 bg-black bg-opacity-50">
      <GlassCard className="max-w-md p-6 text-center">
        <div className="mb-4">
          {moment.character_frame_url && (
            <img
              src={moment.character_frame_url}
              alt={moment.character_name}
              className="w-32 h-32 rounded-full mx-auto mb-4 object-cover border-4 border-white border-opacity-20"
            />
          )}
          <h3 className="text-2xl font-bold mb-2">{moment.character_name}</h3>
          <p className="text-lg text-gray-300">{moment.interaction_prompt}</p>
        </div>

        <div className="flex gap-3 justify-center">
          <GlassButton onClick={onDismiss} variant="secondary">
            {t("player.interaction.skip")}
          </GlassButton>
          <GlassButton onClick={onAccept} size="lg">
            {t("player.interaction.start")}
          </GlassButton>
        </div>

        <p className="text-sm text-gray-400 mt-4">
          {t("player.interaction.window", { duration: moment.duration })}
        </p>
      </GlassCard>
    </div>
  );
};

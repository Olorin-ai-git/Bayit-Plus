/**
 * Interactive Moment Editor - Admin Component
 *
 * Admin tool for marking interactive moments in VOD content.
 * Allows content curators to:
 * - Mark timestamps where avatar interactions can occur
 * - Extract character frames for animation
 * - Set character metadata and prompts
 */

import React, { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { GlassCard, GlassButton, GlassInput, GlassSelect } from "@bayit/glass";
import api from "../../services/api";
import logger from "../../utils/logger";

interface InteractiveMoment {
  timestamp: number;
  duration: number;
  scene_context: string;
  character_name: string;
  character_frame_url?: string;
  interaction_prompt: string;
}

interface Props {
  contentId: string;
  videoUrl: string;
  onClose: () => void;
}

export const InteractiveMomentEditor: React.FC<Props> = ({
  contentId,
  videoUrl,
  onClose,
}) => {
  const { t } = useTranslation();
  const [moments, setMoments] = useState<InteractiveMoment[]>([]);
  const [newMoment, setNewMoment] = useState<Partial<InteractiveMoment>>({
    timestamp: 0,
    duration: 30,
    scene_context: "",
    character_name: "",
    interaction_prompt: "",
  });
  const [isExtracting, setIsExtracting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    loadMoments();
  }, [contentId]);

  const loadMoments = async () => {
    try {
      const content = await api.get(`/admin/content/${contentId}`);
      setMoments(content.interactive_moments || []);
    } catch (error) {
      logger.error(
        "Failed to load interactive moments",
        "InteractiveMomentEditor",
        { error },
      );
    }
  };

  const handleSetTimestamp = () => {
    if (videoRef.current) {
      setNewMoment({
        ...newMoment,
        timestamp: videoRef.current.currentTime,
      });
    }
  };

  const handleExtractFrame = async () => {
    if (!newMoment.timestamp) {
      setErrorMessage(t("admin.moments.setTimestampFirst"));
      return;
    }

    setIsExtracting(true);
    setErrorMessage(null);
    try {
      const response = await api.post("/admin/content/extract-frame", {
        content_id: contentId,
        timestamp: newMoment.timestamp,
      });

      setNewMoment({
        ...newMoment,
        character_frame_url: response.frame_url,
      });
    } catch (error) {
      logger.error("Frame extraction failed", "InteractiveMomentEditor", {
        error,
      });
      setErrorMessage(t("admin.moments.extractFrameFailed"));
    } finally {
      setIsExtracting(false);
    }
  };

  const handleAddMoment = async () => {
    if (!newMoment.character_name || !newMoment.interaction_prompt) {
      setErrorMessage(t("admin.moments.fillRequiredFields"));
      return;
    }

    const moment: InteractiveMoment = {
      timestamp: newMoment.timestamp || 0,
      duration: newMoment.duration || 30,
      scene_context: newMoment.scene_context || "",
      character_name: newMoment.character_name,
      character_frame_url: newMoment.character_frame_url,
      interaction_prompt: newMoment.interaction_prompt,
    };

    setMoments([...moments, moment]);
    setErrorMessage(null);

    setNewMoment({
      timestamp: 0,
      duration: 30,
      scene_context: "",
      character_name: "",
      interaction_prompt: "",
    });
  };

  const handleSaveAllMoments = async () => {
    setIsSaving(true);
    setErrorMessage(null);
    try {
      await api.patch(`/admin/content/${contentId}/interactive-moments`, {
        moments,
      });
      setStatusMessage(t("admin.moments.savedSuccessfully"));
      onClose();
    } catch (error) {
      logger.error("Failed to save moments", "InteractiveMomentEditor", {
        error,
      });
      setErrorMessage(t("admin.moments.saveFailed"));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteMoment = (index: number) => {
    setMoments(moments.filter((_, i) => i !== index));
  };

  const handleSeekToMoment = (timestamp: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = timestamp;
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <GlassCard className="w-full max-w-6xl max-h-[90vh] overflow-y-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">{t("admin.moments.title")}</h2>
          <GlassButton onClick={onClose} variant="secondary">
            {t("common.close")}
          </GlassButton>
        </div>

        {errorMessage && (
          <div className="mb-4 p-3 bg-red-500 bg-opacity-10 border border-red-500 border-opacity-30 rounded-lg text-red-400 text-sm">
            {errorMessage}
          </div>
        )}

        {statusMessage && (
          <div className="mb-4 p-3 bg-green-500 bg-opacity-10 border border-green-500 border-opacity-30 rounded-lg text-green-400 text-sm">
            {statusMessage}
          </div>
        )}

        <div className="grid grid-cols-2 gap-6">
          {/* Video Preview */}
          <div>
            <h3 className="text-lg font-semibold mb-3">
              {t("admin.moments.videoPreview")}
            </h3>
            <video
              ref={videoRef}
              src={videoUrl}
              controls
              className="w-full rounded-lg"
            />

            {/* Existing Moments Timeline */}
            <div className="mt-4">
              <h4 className="font-semibold mb-2">
                {t("admin.moments.interactiveMoments", {
                  count: moments.length,
                })}
              </h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {moments.map((moment, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-white bg-opacity-5 rounded"
                  >
                    <div className="flex-1">
                      <div className="font-semibold">
                        {moment.character_name}
                      </div>
                      <div className="text-sm text-gray-300">
                        {formatTime(moment.timestamp)} -{" "}
                        {moment.interaction_prompt}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <GlassButton
                        onClick={() => handleSeekToMoment(moment.timestamp)}
                        variant="secondary"
                        size="sm"
                      >
                        {t("admin.moments.seek")}
                      </GlassButton>
                      <GlassButton
                        onClick={() => handleDeleteMoment(index)}
                        variant="danger"
                        size="sm"
                      >
                        {t("common.delete")}
                      </GlassButton>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* New Moment Form */}
          <div>
            <h3 className="text-lg font-semibold mb-3">
              {t("admin.moments.addNewMoment")}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  {t("admin.moments.timestamp")}
                </label>
                <div className="flex gap-2">
                  <GlassInput
                    type="number"
                    value={newMoment.timestamp || 0}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setNewMoment({
                        ...newMoment,
                        timestamp: parseFloat(e.target.value),
                      })
                    }
                    placeholder="0.0"
                    step="0.1"
                  />
                  <GlassButton onClick={handleSetTimestamp} variant="secondary">
                    {t("admin.moments.useCurrentTime")}
                  </GlassButton>
                </div>
                <div className="text-sm text-gray-400 mt-1">
                  {t("admin.moments.current")}:{" "}
                  {formatTime(newMoment.timestamp || 0)}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  {t("admin.moments.durationSeconds")}
                </label>
                <GlassInput
                  type="number"
                  value={newMoment.duration || 30}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setNewMoment({
                      ...newMoment,
                      duration: parseInt(e.target.value),
                    })
                  }
                  placeholder="30"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  {t("admin.moments.characterName")}
                </label>
                <GlassInput
                  type="text"
                  value={newMoment.character_name || ""}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setNewMoment({
                      ...newMoment,
                      character_name: e.target.value,
                    })
                  }
                  placeholder={t("admin.moments.characterNamePlaceholder")}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  {t("admin.moments.sceneContext")}
                </label>
                <textarea
                  value={newMoment.scene_context || ""}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setNewMoment({
                      ...newMoment,
                      scene_context: e.target.value,
                    })
                  }
                  placeholder={t("admin.moments.sceneContextPlaceholder")}
                  className="w-full px-3 py-2 bg-white bg-opacity-10 rounded border border-white border-opacity-20 focus:outline-none focus:border-opacity-40"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  {t("admin.moments.interactionPrompt")}
                </label>
                <GlassInput
                  type="text"
                  value={newMoment.interaction_prompt || ""}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setNewMoment({
                      ...newMoment,
                      interaction_prompt: e.target.value,
                    })
                  }
                  placeholder={t("admin.moments.interactionPromptPlaceholder")}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  {t("admin.moments.characterFrame")}
                </label>
                <div className="flex gap-2">
                  <GlassButton
                    onClick={handleExtractFrame}
                    isLoading={isExtracting}
                    disabled={!newMoment.timestamp}
                  >
                    {t("admin.moments.extractFrame")}
                  </GlassButton>
                </div>
                {newMoment.character_frame_url && (
                  <img
                    src={newMoment.character_frame_url}
                    alt={t("admin.moments.characterFrame")}
                    className="mt-2 w-32 h-32 object-cover rounded"
                  />
                )}
              </div>

              <div className="flex gap-2 pt-4">
                <GlassButton onClick={handleAddMoment} className="flex-1">
                  {t("admin.moments.addMoment")}
                </GlassButton>
              </div>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="mt-6 flex justify-end gap-2">
          <GlassButton onClick={onClose} variant="secondary">
            {t("common.cancel")}
          </GlassButton>
          <GlassButton
            onClick={handleSaveAllMoments}
            isLoading={isSaving}
            disabled={moments.length === 0}
          >
            {t("admin.moments.saveAllMoments", { count: moments.length })}
          </GlassButton>
        </div>
      </GlassCard>
    </div>
  );
};

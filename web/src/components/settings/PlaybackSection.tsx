/**
 * PlaybackSection
 * Video playback settings: quality, autoplay, skip intro/credits, speed, etc.
 */

import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useDirection } from "@/hooks/useDirection";
import {
  Play,
  SkipForward,
  Gauge,
  Zap,
  FastForward,
  MessageCircle,
} from "lucide-react";
import { SettingSection } from "./shared/SettingSection";
import { SettingRow } from "./shared/SettingRow";
import { SettingSelect } from "./shared/SettingSelect";
import { SettingSlider } from "./shared/SettingSlider";
import { profilesService } from "@/services/api";
import logger from "@/utils/logger";

interface PlaybackPrefs {
  video_quality: string;
  autoplay: boolean;
  autoplay_next_episode: boolean;
  autoplay_countdown_seconds: number;
  continue_watching: boolean;
  skip_intro: boolean;
  skip_credits: boolean;
  playback_speed: number;
  hardware_acceleration: boolean;
  interactive_moments_enabled: boolean;
}

const DEFAULTS: PlaybackPrefs = {
  video_quality: "auto",
  autoplay: true,
  autoplay_next_episode: true,
  autoplay_countdown_seconds: 5,
  continue_watching: true,
  skip_intro: false,
  skip_credits: false,
  playback_speed: 1.0,
  hardware_acceleration: true,
  interactive_moments_enabled: false,
};

export function PlaybackSection() {
  const { t } = useTranslation();
  const { isRTL } = useDirection();
  const [prefs, setPrefs] = useState<PlaybackPrefs>(DEFAULTS);

  useEffect(() => {
    loadPrefs();
  }, []);

  const loadPrefs = async () => {
    try {
      const data = await profilesService.getPlaybackPreferences();
      setPrefs({ ...DEFAULTS, ...data });
    } catch (error) {
      logger.error("Failed to load playback prefs", "PlaybackSection", error);
    }
  };

  const updatePref = async <K extends keyof PlaybackPrefs>(
    key: K,
    value: PlaybackPrefs[K],
  ) => {
    const prev = prefs;
    setPrefs((p) => ({ ...p, [key]: value }));
    try {
      await profilesService.updatePlaybackPreferences({
        ...prefs,
        [key]: value,
      });
    } catch (error) {
      logger.error("Failed to update playback pref", "PlaybackSection", error);
      setPrefs(prev);
    }
  };

  const qualityOptions = [
    { label: t("settings.qualityAuto", "Auto"), value: "auto" },
    { label: t("settings.qualityHigh", "High"), value: "high" },
    { label: t("settings.qualityMedium", "Medium"), value: "medium" },
    { label: t("settings.qualityLow", "Low"), value: "low" },
  ];

  const speedOptions = [
    { label: "0.5x", value: "0.5" },
    { label: "0.75x", value: "0.75" },
    { label: "1x", value: "1" },
    { label: "1.25x", value: "1.25" },
    { label: "1.5x", value: "1.5" },
    { label: "2x", value: "2" },
  ];

  return (
    <SettingSection title={t("settings.playback", "Playback")} isRTL={isRTL}>
      <SettingSelect
        icon={Gauge}
        label={t("settings.videoQuality", "Video Quality")}
        options={qualityOptions}
        value={prefs.video_quality}
        onValueChange={(v) => updatePref("video_quality", v)}
        isRTL={isRTL}
      />
      <SettingRow
        type="toggle"
        icon={Play}
        label={t("settings.autoplay", "Autoplay")}
        description={t("settings.autoplayDesc", "Automatically play content")}
        value={prefs.autoplay}
        onValueChange={(v) => updatePref("autoplay", v)}
        isRTL={isRTL}
      />
      <SettingRow
        type="toggle"
        icon={FastForward}
        label={t("settings.autoplayNextEpisode", "Autoplay Next Episode")}
        value={prefs.autoplay_next_episode}
        onValueChange={(v) => updatePref("autoplay_next_episode", v)}
        isRTL={isRTL}
      />
      <SettingRow
        type="toggle"
        icon={Play}
        label={t("settings.continueWatching", "Continue Watching")}
        description={t(
          "settings.continueWatchingDesc",
          "Resume from where you left off",
        )}
        value={prefs.continue_watching}
        onValueChange={(v) => updatePref("continue_watching", v)}
        isRTL={isRTL}
      />
      <SettingRow
        type="toggle"
        icon={SkipForward}
        label={t("settings.skipIntro", "Skip Intro")}
        value={prefs.skip_intro}
        onValueChange={(v) => updatePref("skip_intro", v)}
        isRTL={isRTL}
      />
      <SettingRow
        type="toggle"
        icon={SkipForward}
        label={t("settings.skipCredits", "Skip Credits")}
        value={prefs.skip_credits}
        onValueChange={(v) => updatePref("skip_credits", v)}
        isRTL={isRTL}
      />
      <SettingSelect
        icon={Gauge}
        label={t("settings.playbackSpeed", "Playback Speed")}
        options={speedOptions}
        value={String(prefs.playback_speed)}
        onValueChange={(v) => updatePref("playback_speed", Number(v))}
        isRTL={isRTL}
      />
      <SettingRow
        type="toggle"
        icon={Zap}
        label={t("settings.hardwareAcceleration", "Hardware Acceleration")}
        description={t(
          "settings.hardwareAccelerationDesc",
          "Use GPU for video decoding",
        )}
        value={prefs.hardware_acceleration}
        onValueChange={(v) => updatePref("hardware_acceleration", v)}
        isRTL={isRTL}
      />
      <SettingRow
        type="toggle"
        icon={MessageCircle}
        label={t("settings.interactiveMoments", "Interactive Moments")}
        description={t(
          "settings.interactiveMomentsDesc",
          "Show interactive character moments during movies",
        )}
        value={prefs.interactive_moments_enabled}
        onValueChange={(v) => updatePref("interactive_moments_enabled", v)}
        isRTL={isRTL}
      />
    </SettingSection>
  );
}

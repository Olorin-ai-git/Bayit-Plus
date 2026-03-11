import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, Platform } from "react-native";
import { useTranslation } from "react-i18next";
import { GlassLoadingSpinner } from "@bayit/shared/ui";
import { GlassButton } from "@bayit/shared/components/ui/GlassButton";
import { NativeIcon } from "@olorin/shared-icons/native";
import { useGamificationStore } from "@/stores/gamificationStore";
import { LevelProgressBar } from "./LevelProgressBar";
import { PerkUnlockModal } from "./PerkUnlockModal";
import { styles } from "./MissionsDashboard.styles";
import logger from "@bayit/shared-utils/logger";

const dashboardLogger = logger.scope("MissionsDashboard");

interface MissionsDashboardProps {
  profileId: string;
}

export function MissionsDashboard({ profileId }: MissionsDashboardProps) {
  const { t, i18n } = useTranslation();
  const [selectedPerk, setSelectedPerk] = useState<any>(null);

  const { profile, loading, error, fetchProfile, claimPerk, clearError } =
    useGamificationStore();

  useEffect(() => {
    if (profileId) {
      fetchProfile(profileId);
    }
  }, [profileId, fetchProfile]);

  const handleClaimPerk = async (perkId: string) => {
    const success = await claimPerk(profileId, perkId);
    if (success) {
      setSelectedPerk(null);
      dashboardLogger.info("Perk claimed successfully", { perkId });
    }
  };

  if (loading && !profile) {
    return (
      <View style={styles.loadingContainer}>
        <GlassLoadingSpinner size="large" />
        <Text style={styles.loadingText}>{t("gamification.loading")}</Text>
      </View>
    );
  }

  if (error && !profile) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>{error}</Text>
        <GlassButton
          title={t("common.retry")}
          onPress={() => {
            clearError();
            fetchProfile(profileId);
          }}
          variant="primary"
          size="md"
        />
      </View>
    );
  }

  if (!profile) {
    return null;
  }

  const levelTitle =
    i18n.language === "he" ? profile.level_title_he : profile.level_title;
  const xpProgress =
    profile.xp_to_next_level > 0
      ? (profile.current_xp / profile.xp_to_next_level) * 100
      : 100;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.levelCard}>
          <Text style={styles.levelNumber}>{profile.current_level}</Text>
          <Text style={styles.levelTitle}>{levelTitle}</Text>
          <LevelProgressBar
            currentXp={profile.current_xp}
            xpToNextLevel={profile.xp_to_next_level}
            level={profile.current_level}
            title={levelTitle}
          />
        </View>

        <Text style={styles.sectionTitle}>
          {t("gamification.unlockedPerks")}
        </Text>
        {profile.unlocked_perks.length === 0 ? (
          <Text style={styles.xpText}>{t("gamification.noPerksYet")}</Text>
        ) : (
          <View style={styles.perkGrid}>
            {profile.unlocked_perks.map((perk) => (
              <View
                key={perk.perk_id}
                style={styles.perkItem}
                onTouchEnd={() => setSelectedPerk(perk)}
              >
                <View style={styles.perkIcon}>
                  <NativeIcon
                    name={perk.perk_type === "outfit" ? "shirt" : "gift"}
                    size="xl"
                  />
                </View>
                <Text style={styles.perkName}>
                  {t(`gamification.perks.${perk.perk_id}`, {
                    defaultValue: perk.perk_id,
                  })}
                </Text>
              </View>
            ))}
          </View>
        )}

        <Text style={styles.sectionTitle}>{t("gamification.activity")}</Text>
        <View style={styles.activitySection}>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>
              {t("gamification.missionsCompleted")}
            </Text>
            <Text style={styles.statValue}>{profile.missions_completed}</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>
              {t("gamification.mirrorSessions")}
            </Text>
            <Text style={styles.statValue}>{profile.mirror_sessions}</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>
              {t("gamification.talkBackAttempts")}
            </Text>
            <Text style={styles.statValue}>{profile.talk_back_attempts}</Text>
          </View>
          <View style={[styles.statRow, styles.statRowLast]}>
            <Text style={styles.statLabel}>{t("gamification.totalXP")}</Text>
            <Text style={styles.statValue}>{profile.total_xp}</Text>
          </View>
        </View>
      </ScrollView>

      <PerkUnlockModal
        perk={selectedPerk}
        onClaim={handleClaimPerk}
        visible={!!selectedPerk}
        onClose={() => setSelectedPerk(null)}
      />
    </View>
  );
}

export default MissionsDashboard;

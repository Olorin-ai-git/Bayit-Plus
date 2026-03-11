import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import { GlassModal } from "@bayit/shared/ui";
import { GlassButton } from "@bayit/shared/components/ui/GlassButton";
import { NativeIcon } from "@olorin/shared-icons/native";
import type { UnlockedPerk } from "@/stores/gamificationStore.types";

interface PerkUnlockModalProps {
  perk: UnlockedPerk | null;
  onClaim: (perkId: string) => void;
  visible: boolean;
  onClose: () => void;
}

export function PerkUnlockModal({
  perk,
  onClaim,
  visible,
  onClose,
}: PerkUnlockModalProps) {
  const { t } = useTranslation();

  if (!perk) {
    return null;
  }

  return (
    <GlassModal
      visible={visible}
      onClose={onClose}
      title={t(`gamification.perks.${perk.perk_id}`, {
        defaultValue: perk.perk_id,
      })}
    >
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <NativeIcon
            name={perk.perk_type === "outfit" ? "shirt" : "gift"}
            size="xl"
          />
        </View>
        <Text style={styles.subtitle}>
          {t("gamification.unlockedAtLevel", { level: perk.level_unlocked })}
        </Text>
        <Text style={styles.description}>
          {t(`gamification.perkDescriptions.${perk.perk_id}`, {
            defaultValue: t("gamification.perkUnlocked"),
          })}
        </Text>

        <View style={styles.buttonContainer}>
          <GlassButton
            title={t("gamification.claim")}
            onPress={() => onClaim(perk.perk_id)}
            variant="primary"
            size="md"
          />
          <GlassButton
            title={t("common.close")}
            onPress={onClose}
            variant="secondary"
            size="md"
          />
        </View>
      </View>
    </GlassModal>
  );
}

const styles = StyleSheet.create({
  content: {
    alignItems: "center",
    padding: 16,
  },
  iconContainer: {
    marginBottom: 16,
    alignItems: "center",
  },
  subtitle: {
    fontSize: 14,
    color: "#E5C07B",
    marginBottom: 16,
    textAlign: "center",
  },
  description: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.7)",
    marginBottom: 24,
    textAlign: "center",
    lineHeight: 24,
  },
  buttonContainer: {
    width: "100%",
    gap: 12,
  },
});

export default PerkUnlockModal;

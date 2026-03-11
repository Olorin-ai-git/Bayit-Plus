/**
 * PhoneticMirrorPage
 *
 * Standalone route wrapper for the Phonetic Mirror pronunciation practice
 * feature. Resolves the active profile and user IDs from context/store and
 * passes them to PhoneticMirrorPanel as required props.
 */

import React from "react";
import { View, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import { Mic } from "lucide-react";
import { GlassPageHeader, GlassLoadingSpinner } from "@bayit/shared/ui";
import { useDirection } from "@/hooks/useDirection";
import { useAuthStore } from "@/stores/authStore";
import { useProfileStore } from "@/contexts/ProfileContext";
import { PhoneticMirrorPanel } from "@/components/phonetic-mirror/PhoneticMirrorPanel";
import { colors, spacing } from "@olorin/design-tokens";

export default function PhoneticMirrorPage() {
  const { t } = useTranslation();
  const { isRTL } = useDirection();
  const user = useAuthStore((state) => state.user);
  const activeProfile = useProfileStore((state) => state.activeProfile);

  // profileId comes from the active profile; fall back to user ID when no
  // profile has been selected yet (single-profile accounts skip selection).
  const profileId = activeProfile?.id ?? user?.id ?? "";

  // avatarId is a Zeh Ani concept – in standalone mode the backend ignores it,
  // but the field is required by the panel contract. Use the user ID as a
  // stable opaque identifier so the prop is always a non-empty string.
  const avatarId = user?.id ?? "";

  if (!profileId || !avatarId) {
    return (
      <View style={styles.centered}>
        <GlassLoadingSpinner />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <GlassPageHeader
        title={t("phoneticMirror.pageTitle", "Pronunciation Practice")}
        pageType="phonetic-mirror"
        isRTL={isRTL}
        icon={<Mic size={24} color={colors.primary.DEFAULT} />}
      />
      <PhoneticMirrorPanel avatarId={avatarId} profileId={profileId} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    maxWidth: 800,
    marginHorizontal: "auto" as any,
    width: "100%",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});

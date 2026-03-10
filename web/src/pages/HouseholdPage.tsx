import { useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import {
  GlassPageHeader,
  GlassEmptyState,
  GlassInput,
  GlassButton,
  GlassCard,
} from "@bayit/shared/ui";
import { GlassLoadingSpinner } from "@bayit/shared/ui";
import { colors, spacing } from "@olorin/design-tokens";
import { useDirection } from "@/hooks/useDirection";
import { useAuthStore } from "@bayit/shared-stores/authStore";
import { useHouseholdStore } from "@/stores/householdStore";
import { MemberList } from "@/components/household/MemberList";
import { InviteSection } from "@/components/household/InviteSection";

export default function HouseholdPage() {
  const { t } = useTranslation();
  const { textAlign } = useDirection();
  const user = useAuthStore((s) => s.user);
  const {
    household,
    isLoading,
    error,
    fetchHousehold,
    createHousehold,
    updateHousehold,
    removeMember,
    inviteMember,
  } = useHouseholdStore();

  const [newName, setNewName] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    fetchHousehold();
  }, [fetchHousehold]);

  const handleCreate = () => {
    if (newName.trim()) {
      createHousehold(newName.trim());
      setNewName("");
    }
  };

  const handleSaveName = () => {
    if (household && newName.trim()) {
      updateHousehold(newName.trim());
      setIsEditing(false);
    }
  };

  const isOwner = household?.owner_id === user?.uid;

  if (isLoading && !household) {
    return (
      <View style={styles.centered}>
        <GlassLoadingSpinner size="large" />
      </View>
    );
  }

  if (!household) {
    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
      >
        <GlassPageHeader title={t("nav.household")} />
        <GlassEmptyState
          title={t("household.empty.title")}
          subtitle={t("household.empty.subtitle")}
        />
        <GlassCard style={styles.createCard}>
          <GlassInput
            value={newName}
            onChangeText={setNewName}
            placeholder={t("household.create.namePlaceholder")}
          />
          <GlassButton
            title={t("household.create.button")}
            onPress={handleCreate}
            variant="primary"
            size="md"
            disabled={!newName.trim()}
          />
        </GlassCard>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <GlassPageHeader title={t("nav.household")} />

      {isEditing ? (
        <View style={styles.editRow}>
          <GlassInput
            value={newName}
            onChangeText={setNewName}
            placeholder={household.name}
          />
          <GlassButton
            title={t("common.save")}
            onPress={handleSaveName}
            variant="primary"
            size="sm"
          />
          <GlassButton
            title={t("common.cancel")}
            onPress={() => setIsEditing(false)}
            variant="ghost"
            size="sm"
          />
        </View>
      ) : (
        <View style={styles.nameRow}>
          <Text style={[styles.householdName, { textAlign }]}>
            {household.name}
          </Text>
          {isOwner && (
            <GlassButton
              title={t("common.edit")}
              onPress={() => {
                setNewName(household.name);
                setIsEditing(true);
              }}
              variant="ghost"
              size="sm"
            />
          )}
        </View>
      )}

      {error && <Text style={styles.errorText}>{t(error)}</Text>}

      <View style={styles.sections}>
        <MemberList
          members={household.members}
          isOwner={isOwner}
          onRemove={removeMember}
        />
        {isOwner && (
          <InviteSection
            pendingInvitations={household.pending_invitations}
            onInvite={inviteMember}
          />
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingBottom: spacing.xl },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  createCard: {
    margin: spacing.md,
    padding: spacing.lg,
    gap: spacing.md,
    maxWidth: 400,
    alignSelf: "center",
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
  },
  householdName: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.text,
    flex: 1,
  },
  editRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
  },
  sections: { paddingHorizontal: spacing.md, gap: spacing.xl },
  errorText: {
    fontSize: 13,
    color: colors.error,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
});

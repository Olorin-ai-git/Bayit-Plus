import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import { GlassCard, GlassButton } from "@bayit/shared/ui";
import { colors, spacing, borderRadius } from "@olorin/design-tokens";
import { renderIcon } from "@olorin/shared-icons/web";
import { useDirection } from "@/hooks/useDirection";
import type { HouseholdMember } from "@/stores/householdStore";

const ROLE_STYLES: Record<string, { bgColor: string; textColor: string }> = {
  owner: { bgColor: "rgba(234, 179, 8, 0.2)", textColor: "#eab308" },
  guardian: { bgColor: "rgba(59, 130, 246, 0.2)", textColor: "#3b82f6" },
  child: { bgColor: "rgba(34, 197, 94, 0.2)", textColor: "#22c55e" },
};

interface MemberListProps {
  members: HouseholdMember[];
  isOwner: boolean;
  onRemove: (userId: string) => void;
}

export const MemberList: React.FC<MemberListProps> = ({
  members,
  isOwner,
  onRemove,
}) => {
  const { t } = useTranslation();
  const { isRTL, textAlign } = useDirection();

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { textAlign }]}>
        {t("household.members")}
      </Text>
      {members.map((member) => {
        const roleStyle = ROLE_STYLES[member.role] || ROLE_STYLES.child;
        return (
          <GlassCard key={member.user_id} style={styles.memberCard}>
            <View
              style={[
                styles.memberRow,
                { flexDirection: isRTL ? "row-reverse" : "row" },
              ]}
            >
              <View style={styles.avatarWrap}>
                {renderIcon("person", "sm", "secondary")}
              </View>
              <View style={styles.memberInfo}>
                <Text style={styles.memberName}>{member.display_name}</Text>
                <Text style={styles.memberEmail}>{member.email}</Text>
              </View>
              <View
                style={[
                  styles.roleBadge,
                  { backgroundColor: roleStyle.bgColor },
                ]}
              >
                <Text style={[styles.roleText, { color: roleStyle.textColor }]}>
                  {t(`household.role.${member.role}`)}
                </Text>
              </View>
              {isOwner && member.role !== "owner" && (
                <GlassButton
                  title={t("household.removeMember")}
                  onPress={() => onRemove(member.user_id)}
                  variant="ghost"
                  size="sm"
                />
              )}
            </View>
          </GlassCard>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { gap: spacing.sm },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing.xs,
  },
  memberCard: { padding: spacing.md },
  memberRow: { alignItems: "center", gap: spacing.sm },
  avatarWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  memberInfo: { flex: 1 },
  memberName: { fontSize: 14, fontWeight: "600", color: colors.text },
  memberEmail: { fontSize: 12, color: colors.textSecondary },
  roleBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  roleText: { fontSize: 11, fontWeight: "600" },
});

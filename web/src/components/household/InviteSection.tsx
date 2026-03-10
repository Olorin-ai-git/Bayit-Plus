import React, { useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import {
  GlassCard,
  GlassInput,
  GlassButton,
  GlassSelect,
} from "@bayit/shared/ui";
import { colors, spacing, borderRadius } from "@olorin/design-tokens";
import { useDirection } from "@/hooks/useDirection";
import type { PendingInvitation } from "@/stores/householdStore";

interface InviteSectionProps {
  pendingInvitations: PendingInvitation[];
  onInvite: (email: string, role: "guardian" | "child") => void;
}

export const InviteSection: React.FC<InviteSectionProps> = ({
  pendingInvitations,
  onInvite,
}) => {
  const { t } = useTranslation();
  const { textAlign, isRTL } = useDirection();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"guardian" | "child">("guardian");

  const handleInvite = () => {
    if (email.trim()) {
      onInvite(email.trim(), role);
      setEmail("");
    }
  };

  const roleOptions = [
    { value: "guardian", label: t("household.role.guardian") },
    { value: "child", label: t("household.role.child") },
  ];

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { textAlign }]}>
        {t("household.invite.title")}
      </Text>
      <GlassCard style={styles.form}>
        <GlassInput
          value={email}
          onChangeText={setEmail}
          placeholder={t("household.invite.emailPlaceholder")}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <View style={styles.roleRow}>
          <GlassSelect
            value={role}
            onValueChange={(v: string) => setRole(v as "guardian" | "child")}
            options={roleOptions}
          />
          <GlassButton
            title={t("household.invite.send")}
            onPress={handleInvite}
            variant="primary"
            size="sm"
            disabled={!email.trim()}
          />
        </View>
      </GlassCard>

      {pendingInvitations.length > 0 && (
        <View style={styles.pending}>
          <Text style={[styles.pendingTitle, { textAlign }]}>
            {t("household.invite.pending")}
          </Text>
          {pendingInvitations.map((inv) => (
            <View
              key={inv.id}
              style={[
                styles.pendingRow,
                { flexDirection: isRTL ? "row-reverse" : "row" },
              ]}
            >
              <Text style={styles.pendingEmail}>{inv.email}</Text>
              <View style={styles.pendingBadge}>
                <Text style={styles.pendingRole}>
                  {t(`household.role.${inv.role}`)}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { gap: spacing.md },
  title: { fontSize: 16, fontWeight: "700", color: colors.text },
  form: { padding: spacing.md, gap: spacing.sm },
  roleRow: { flexDirection: "row", gap: spacing.sm, alignItems: "center" },
  pending: { gap: spacing.xs },
  pendingTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  pendingRow: {
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.xs,
  },
  pendingEmail: { fontSize: 13, color: colors.text },
  pendingBadge: {
    backgroundColor: "rgba(234, 179, 8, 0.2)",
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  pendingRole: { fontSize: 11, color: "#eab308" },
});

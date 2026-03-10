import React, { useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import { GlassCard, GlassInput, GlassButton } from "@bayit/shared/ui";
import { colors, spacing } from "@olorin/design-tokens";
import { useDirection } from "@/hooks/useDirection";

interface XtreamCredentials {
  serverUrl: string;
  username: string;
  password: string;
}

interface AddXtreamSourceSheetProps {
  onSubmit: (credentials: XtreamCredentials) => void;
  onCancel: () => void;
}

export const AddXtreamSourceSheet: React.FC<AddXtreamSourceSheetProps> = ({
  onSubmit,
  onCancel,
}) => {
  const { t } = useTranslation();
  const { textAlign } = useDirection();
  const [serverUrl, setServerUrl] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = () => {
    if (!serverUrl.trim() || !username.trim() || !password.trim()) {
      setError("byoc.error.allFieldsRequired");
      return;
    }
    setError(null);
    onSubmit({ serverUrl, username, password });
  };

  return (
    <GlassCard style={styles.container}>
      <Text style={[styles.title, { textAlign }]}>
        {t("byoc.addXtream.title")}
      </Text>
      <Text style={[styles.subtitle, { textAlign }]}>
        {t("byoc.addXtream.subtitle")}
      </Text>

      <View style={styles.fields}>
        <GlassInput
          value={serverUrl}
          onChangeText={setServerUrl}
          placeholder={t("byoc.addXtream.serverUrl")}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <GlassInput
          value={username}
          onChangeText={setUsername}
          placeholder={t("byoc.addXtream.username")}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <GlassInput
          value={password}
          onChangeText={setPassword}
          placeholder={t("byoc.addXtream.password")}
          secureTextEntry
          autoCapitalize="none"
        />
      </View>

      {error && <Text style={styles.errorText}>{t(error)}</Text>}

      <View style={styles.actions}>
        <GlassButton
          title={t("common.cancel")}
          onPress={onCancel}
          variant="ghost"
          size="sm"
        />
        <GlassButton
          title={t("byoc.addXtream.connect")}
          onPress={handleSubmit}
          variant="primary"
          size="sm"
        />
      </View>
    </GlassCard>
  );
};

const styles = StyleSheet.create({
  container: { padding: spacing.lg, maxWidth: 480, alignSelf: "center" },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  fields: { gap: spacing.sm },
  errorText: { fontSize: 13, color: colors.error, marginTop: spacing.xs },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
});

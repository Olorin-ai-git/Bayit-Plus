import { useState } from "react";
import { View, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import { colors, spacing, borderRadius } from "@olorin/design-tokens";
import { GlassView, GlassInput, GlassButton } from "@bayit/shared/ui";

const VIDEO_URL_PATTERN = /^https?:\/\/[^\s/$.?#].[^\s]*$/i;

interface Props {
  onSubmit: (url: string) => Promise<void>;
  submitting: boolean;
}

export function SubmitUrlForm({ onSubmit, submitting }: Props) {
  const { t } = useTranslation();
  const [url, setUrl] = useState("");
  const [urlError, setUrlError] = useState("");

  const validateUrl = (value: string): boolean => {
    if (!value.trim()) {
      setUrlError(t("submitVideo.urlError"));
      return false;
    }
    if (!VIDEO_URL_PATTERN.test(value.trim())) {
      setUrlError(t("submitVideo.urlErrorFormat"));
      return false;
    }
    setUrlError("");
    return true;
  };

  const handleSubmit = async () => {
    if (!validateUrl(url) || submitting) return;
    await onSubmit(url.trim());
    setUrl("");
  };

  return (
    <GlassView style={styles.form}>
      <GlassInput
        label={t("submitVideo.urlLabel")}
        placeholder={t("submitVideo.urlPlaceholder")}
        value={url}
        onChangeText={(val: string) => {
          setUrl(val);
          if (urlError) validateUrl(val);
        }}
        error={urlError || undefined}
      />
      <View style={styles.submitWrap}>
        <GlassButton
          title={
            submitting
              ? t("submitVideo.submitting")
              : t("submitVideo.submitButton")
          }
          onPress={handleSubmit}
          variant="primary"
          disabled={submitting || !url.trim()}
          style={styles.fullWidth}
        />
      </View>
    </GlassView>
  );
}

const styles = StyleSheet.create({
  form: {
    padding: spacing.xl,
    borderRadius: borderRadius.xl,
    marginBottom: spacing.lg,
  },
  submitWrap: { marginTop: spacing.lg },
  fullWidth: { width: "100%" },
});

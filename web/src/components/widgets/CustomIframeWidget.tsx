/**
 * CustomIframeWidget Component
 *
 * Widget that accepts a user-pasted URL and renders it in a floating iframe.
 * Includes URL validation against an allowlist of safe domains.
 */

import React, { useState, useCallback } from "react";
import { View, Text, TextInput, Pressable } from "react-native";
import { X, ExternalLink, AlertCircle, CheckCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { colors } from "@olorin/design-tokens";
import logger from "@/utils/logger";
import { validateUrl, getAllowedDomainsDisplay } from "./urlValidation";
import { styles, TOUCH_TARGET_SIZE } from "./CustomIframeWidget.styles";

interface CustomIframeWidgetProps {
  onClose: () => void;
  initialUrl?: string;
}

export function CustomIframeWidget({
  onClose,
  initialUrl = "",
}: CustomIframeWidgetProps) {
  const { t } = useTranslation();
  const [urlInput, setUrlInput] = useState(initialUrl);
  const [activeUrl, setActiveUrl] = useState<string | null>(initialUrl || null);
  const [error, setError] = useState<string | null>(null);
  const [isValid, setIsValid] = useState(false);

  const handleUrlChange = useCallback(
    (text: string) => {
      setUrlInput(text);
      const result = validateUrl(text, t);
      setIsValid(result.valid);
      setError(result.valid ? null : result.error || null);
    },
    [t],
  );

  const handleLoadUrl = useCallback(() => {
    const result = validateUrl(urlInput, t);
    if (result.valid) {
      setActiveUrl(urlInput);
      setError(null);
      logger.info("Custom iframe URL loaded", "CustomIframeWidget", {
        url: urlInput,
      });
    } else {
      setError(result.error || t("widgets.invalidUrl"));
    }
  }, [urlInput, t]);

  const handleClose = useCallback(() => {
    logger.info("CustomIframeWidget closed", "CustomIframeWidget");
    onClose();
  }, [onClose]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerInfo}>
          <ExternalLink size={18} color={colors.primary.DEFAULT} />
          <Text style={styles.headerTitle}>{t("widgets.customIframe")}</Text>
        </View>
        <Pressable
          onPress={handleClose}
          style={styles.closeButton}
          accessibilityRole="button"
          accessibilityLabel={t("common.close")}
        >
          <X size={18} color={colors.text} />
        </Pressable>
      </View>

      {!activeUrl && (
        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>{t("widgets.pasteUrl")}</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={[
                styles.urlInput,
                error && styles.urlInputError,
                isValid && styles.urlInputValid,
              ]}
              value={urlInput}
              onChangeText={handleUrlChange}
              placeholder="https://archive.org/embed/..."
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              accessibilityLabel={t("widgets.pasteUrl")}
            />
            <Pressable
              onPress={handleLoadUrl}
              style={[styles.loadButton, !isValid && styles.loadButtonDisabled]}
              disabled={!isValid}
              accessibilityRole="button"
              accessibilityLabel={t("common.load", "Load")}
            >
              <Text style={styles.loadButtonText}>
                {t("common.load", "Load")}
              </Text>
            </Pressable>
          </View>
          {error && (
            <View style={styles.statusRow}>
              <AlertCircle size={16} color={colors.error.DEFAULT} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}
          {isValid && urlInput && (
            <View style={styles.statusRow}>
              <CheckCircle size={16} color={colors.success.DEFAULT} />
              <Text style={styles.validText}>
                {t("widgets.urlValid", "URL is valid")}
              </Text>
            </View>
          )}
          <View style={styles.domainsInfo}>
            <Text style={styles.domainsLabel}>
              {t("widgets.allowedDomains", "Allowed domains:")}
            </Text>
            <Text style={styles.domainsList}>{getAllowedDomainsDisplay()}</Text>
          </View>
        </View>
      )}

      {activeUrl && (
        <View style={styles.iframeContainer}>
          <iframe
            src={activeUrl}
            style={{ width: "100%", height: "100%", border: "none" }}
            title={t("widgets.customContent")}
            allow="autoplay; fullscreen; picture-in-picture"
            sandbox="allow-scripts allow-same-origin allow-presentation"
            allowFullScreen
          />
          <Pressable
            onPress={() => setActiveUrl(null)}
            style={styles.changeUrlButton}
            accessibilityRole="button"
            accessibilityLabel={t("widgets.changeUrl", "Change URL")}
          >
            <Text style={styles.changeUrlText}>
              {t("widgets.changeUrl", "Change URL")}
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

export default CustomIframeWidget;

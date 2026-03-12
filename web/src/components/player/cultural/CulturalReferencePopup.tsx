import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useTranslation } from "react-i18next";
import {
  colors,
  spacing,
  fontSize,
  borderRadius,
  glass,
} from "@olorin/design-tokens";
import { logger } from "@bayit/shared-utils/logger";
import api from "@/services/api";

interface ReferenceExplanation {
  reference_id: string;
  canonical_name_hebrew: string;
  canonical_name_english: string;
  category: string;
  explanation: string;
  related_references: Array<{
    reference_id: string;
    name: string;
    relationship: string;
  }>;
}

interface CulturalReferencePopupProps {
  referenceId: string;
  visible: boolean;
  onClose: () => void;
}

const CulturalReferencePopup: React.FC<CulturalReferencePopupProps> = ({
  referenceId,
  visible,
  onClose,
}) => {
  const { t } = useTranslation();
  const [explanation, setExplanation] = useState<ReferenceExplanation | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible || !referenceId) {
      return;
    }

    const fetchExplanation = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = (await api.get(
          `/cultural/explain/${referenceId}`,
        )) as ReferenceExplanation;

        setExplanation(response);
        logger.debug("Cultural reference explanation fetched", { referenceId });
      } catch (err) {
        logger.error("Failed to fetch cultural reference explanation", {
          error: err,
          referenceId,
        });
        setError(t("culturalContext.loadError"));
      } finally {
        setLoading(false);
      }
    };

    fetchExplanation();
  }, [referenceId, visible, t]);

  if (!visible) {
    return null;
  }

  return (
    <View style={styles.overlay}>
      <Pressable style={styles.backdrop} onPress={onClose} />

      <View style={styles.popup}>
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>
              {t("culturalContext.loading")}
            </Text>
          </View>
        )}

        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeButtonText}>{t("common.close")}</Text>
            </Pressable>
          </View>
        )}

        {!loading && !error && explanation && (
          <>
            <View style={styles.header}>
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryText}>{explanation.category}</Text>
              </View>
              <Pressable style={styles.closeIcon} onPress={onClose}>
                <Text style={styles.closeIconText}>×</Text>
              </Pressable>
            </View>

            <View style={styles.content}>
              <Text style={styles.hebrewName}>
                {explanation.canonical_name_hebrew}
              </Text>
              <Text style={styles.englishName}>
                {explanation.canonical_name_english}
              </Text>

              <Text style={styles.explanation}>{explanation.explanation}</Text>

              {explanation.related_references.length > 0 && (
                <View style={styles.relatedSection}>
                  <Text style={styles.relatedTitle}>
                    {t("culturalContext.related")}
                  </Text>
                  {explanation.related_references.map((related, index) => (
                    <View
                      key={`${related.reference_id}-${index}`}
                      style={styles.relatedItem}
                    >
                      <Text style={styles.relatedName}>{related.name}</Text>
                      <Text style={styles.relatedRelationship}>
                        {related.relationship}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.background.overlay,
  },
  popup: {
    width: "90%",
    maxWidth: 400,
    backgroundColor: glass.background,
    backdropFilter: glass.backdropFilter,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    shadowColor: colors.textPrimary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
  },
  loadingContainer: {
    alignItems: "center",
    paddingVertical: spacing.xl,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  errorContainer: {
    alignItems: "center",
    paddingVertical: spacing.lg,
  },
  errorText: {
    fontSize: fontSize.base,
    color: colors.error,
    textAlign: "center",
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  categoryBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
  },
  categoryText: {
    fontSize: fontSize.xs,
    color: colors.background.primary,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  closeIcon: {
    padding: spacing.xs,
  },
  closeIconText: {
    fontSize: fontSize["2xl"],
    color: colors.textSecondary,
    fontWeight: "300",
  },
  content: {
    gap: spacing.md,
  },
  hebrewName: {
    fontSize: fontSize.xl,
    fontWeight: "700",
    color: colors.textPrimary,
    textAlign: "center",
  },
  englishName: {
    fontSize: fontSize.base,
    color: colors.textSecondary,
    textAlign: "center",
    fontStyle: "italic",
  },
  explanation: {
    fontSize: fontSize.base,
    color: colors.textPrimary,
    lineHeight: 24,
    marginTop: spacing.sm,
  },
  relatedSection: {
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  relatedTitle: {
    fontSize: fontSize.sm,
    fontWeight: "700",
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    textTransform: "uppercase",
  },
  relatedItem: {
    marginBottom: spacing.sm,
  },
  relatedName: {
    fontSize: fontSize.sm,
    color: colors.textPrimary,
    fontWeight: "600",
  },
  relatedRelationship: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  closeButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.md,
  },
  closeButtonText: {
    fontSize: fontSize.sm,
    color: colors.textPrimary,
    fontWeight: "600",
  },
});

export default CulturalReferencePopup;

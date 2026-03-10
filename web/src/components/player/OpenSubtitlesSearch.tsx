import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { useTranslation } from "react-i18next";
import {
  GlassInput,
  GlassButton,
  GlassCard,
  GlassLoadingSpinner,
} from "@bayit/shared/ui";
import { colors, spacing, borderRadius } from "@olorin/design-tokens";
import { subtitlesService } from "@/services/api";
import { useDirection } from "@/hooks/useDirection";
import logger from "@bayit/shared-utils/logger";

const searchLogger = logger.scope("OpenSubtitlesSearch");

interface SubtitleResult {
  id: string;
  language: string;
  release_name: string;
  download_count: number;
  rating: number;
  download_url: string;
}

interface OpenSubtitlesSearchProps {
  onApply: (subtitleUrl: string, language: string) => void;
  onClose: () => void;
  contentTitle?: string;
  imdbId?: string;
}

export const OpenSubtitlesSearch: React.FC<OpenSubtitlesSearchProps> = ({
  onApply,
  onClose,
  contentTitle,
  imdbId,
}) => {
  const { t } = useTranslation();
  const { isRTL, textAlign } = useDirection();
  const [query, setQuery] = useState(contentTitle || "");
  const [results, setResults] = useState<SubtitleResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setIsSearching(true);
    setError(null);
    try {
      const data = await subtitlesService.searchOpenSubtitles({
        query: query.trim(),
        imdb_id: imdbId,
      });
      setResults(data.results || []);
    } catch (err) {
      searchLogger.error("OpenSubtitles search failed", { err });
      setError(t("player.openSubs.searchFailed"));
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelect = (result: SubtitleResult) => {
    onApply(result.download_url, result.language);
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { textAlign }]}>
        {t("player.openSubs.title")}
      </Text>

      <View
        style={[
          styles.searchRow,
          { flexDirection: isRTL ? "row-reverse" : "row" },
        ]}
      >
        <View style={styles.inputWrap}>
          <GlassInput
            value={query}
            onChangeText={setQuery}
            placeholder={t("player.openSubs.searchPlaceholder")}
          />
        </View>
        <GlassButton
          title={t("player.openSubs.search")}
          onPress={handleSearch}
          variant="primary"
          size="sm"
          disabled={!query.trim() || isSearching}
        />
      </View>

      {error && <Text style={styles.errorText}>{error}</Text>}

      {isSearching ? (
        <View style={styles.centered}>
          <GlassLoadingSpinner size="small" />
        </View>
      ) : (
        <ScrollView style={styles.results}>
          {results.map((result) => (
            <TouchableOpacity
              key={result.id}
              onPress={() => handleSelect(result)}
            >
              <GlassCard style={styles.resultCard}>
                <View
                  style={[
                    styles.resultRow,
                    { flexDirection: isRTL ? "row-reverse" : "row" },
                  ]}
                >
                  <View style={styles.resultInfo}>
                    <Text style={styles.releaseName} numberOfLines={1}>
                      {result.release_name}
                    </Text>
                    <View style={styles.metaRow}>
                      <Text style={styles.lang}>
                        {result.language.toUpperCase()}
                      </Text>
                      <Text style={styles.meta}>
                        {t("player.openSubs.downloads", {
                          count: result.download_count,
                        })}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.ratingBadge}>
                    <Text style={styles.ratingText}>
                      {result.rating.toFixed(1)}
                    </Text>
                  </View>
                </View>
              </GlassCard>
            </TouchableOpacity>
          ))}
          {results.length === 0 && !isSearching && query && (
            <Text style={[styles.emptyText, { textAlign }]}>
              {t("player.openSubs.noResults")}
            </Text>
          )}
        </ScrollView>
      )}

      <GlassButton
        title={t("common.close")}
        onPress={onClose}
        variant="ghost"
        size="sm"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { padding: spacing.md, gap: spacing.md, maxHeight: 500 },
  title: { fontSize: 16, fontWeight: "700", color: colors.text },
  searchRow: { gap: spacing.sm, alignItems: "center" },
  inputWrap: { flex: 1 },
  errorText: { fontSize: 12, color: colors.error },
  centered: { padding: spacing.lg, alignItems: "center" },
  results: { maxHeight: 300 },
  resultCard: { padding: spacing.sm, marginBottom: spacing.xs },
  resultRow: { alignItems: "center", gap: spacing.sm },
  resultInfo: { flex: 1 },
  releaseName: { fontSize: 13, fontWeight: "500", color: colors.text },
  metaRow: { flexDirection: "row", gap: spacing.sm, marginTop: 2 },
  lang: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.primary.DEFAULT,
    backgroundColor: "rgba(59,130,246,0.2)",
    paddingHorizontal: 4,
    borderRadius: borderRadius.sm,
  },
  meta: { fontSize: 11, color: colors.textSecondary },
  ratingBadge: {
    backgroundColor: "rgba(234,179,8,0.2)",
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  ratingText: { fontSize: 12, fontWeight: "600", color: "#eab308" },
  emptyText: { fontSize: 13, color: colors.textSecondary, padding: spacing.md },
});

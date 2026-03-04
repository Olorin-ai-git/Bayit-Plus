/**
 * Audiobooks Discovery Page
 * Main entry point for audiobook browsing and discovery
 */

import { useState, useEffect, useMemo, useRef } from "react";
import { View, StyleSheet, ScrollView, Pressable } from "react-native";
import { useTranslation } from "react-i18next";
import { useDirection } from "@/hooks/useDirection";
import { Search, X, RefreshCw } from "lucide-react";
import audiobookService from "@/services/audiobookService";
import type { AudiobookAuthor } from "@/services/audiobookService";
import { colors, spacing } from "@olorin/design-tokens";
import {
  GlassView,
  GlassInput,
  GlassPageHeader,
  GlassEmptyState,
} from "@bayit/shared/ui";
import { WidgetToggleProvider } from "@/contexts/WidgetToggleContext";
import logger from "@/utils/logger";
import PageLoading from "@/components/common/PageLoading";
import type { Audiobook, AudiobookFilters } from "@/types/audiobook";
import AudiobooksPageFilters from "./AudiobooksPageFilters";
import AudiobooksPageGrid from "./AudiobooksPageGrid";

const PAGE_SIZE = 20;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: `${colors.border}33`,
  },
  searchContainer: {
    marginHorizontal: spacing.xl,
    marginVertical: spacing.md,
  },
  refreshButton: {
    padding: spacing.md,
  },
  refreshButtonDisabled: {
    opacity: 0.5,
  },
});

export default function AudiobooksPage() {
  const { t } = useTranslation();
  const { isRTL } = useDirection();

  const [audiobooks, setAudiobooks] = useState<Audiobook[]>([]);
  const [authors, setAuthors] = useState<AudiobookAuthor[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<AudiobookFilters>({
    page: 1,
    page_size: PAGE_SIZE,
  } as AudiobookFilters);

  // Track which backend params actually changed to avoid refetching
  const prevBackendKey = useRef("");

  // Backend-relevant key: only page + page_size + author
  const backendKey = `${filters.page}:${filters.page_size}:${filters.author || ""}`;

  // Apply client-side filtering and sorting
  const displayAudiobooks = useMemo(() => {
    let items = [...audiobooks];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      items = items.filter(
        (book) =>
          book.title.toLowerCase().includes(query) ||
          book.author?.toLowerCase().includes(query) ||
          book.narrator?.toLowerCase().includes(query),
      );
    }

    // Quality filter
    if (filters.audio_quality) {
      items = items.filter((b) => b.audio_quality === filters.audio_quality);
    }

    // Subscription filter
    if (filters.requires_subscription) {
      items = items.filter(
        (b) => b.requires_subscription === filters.requires_subscription,
      );
    }

    // Client-side sort
    const order = filters.sort_order === "asc" ? 1 : -1;
    if (filters.sort_by === "title") {
      items.sort((a, b) => order * a.title.localeCompare(b.title));
    } else if (filters.sort_by === "views") {
      items.sort((a, b) => order * (a.view_count - b.view_count));
    } else if (filters.sort_by === "rating") {
      items.sort((a, b) => order * (a.avg_rating - b.avg_rating));
    }
    // "newest" keeps server order (already sorted by created_at desc)

    return items;
  }, [audiobooks, searchQuery, filters]);

  // Collect items for widget toggle batch-check
  const widgetItems = useMemo(() => {
    return audiobooks.map((book) => ({
      content_type: "audiobook",
      content_id: book.id,
    }));
  }, [audiobooks]);

  // Fetch data on mount and when backend-relevant filters change
  useEffect(() => {
    if (backendKey === prevBackendKey.current) return;
    prevBackendKey.current = backendKey;
    loadData();
  }, [backendKey]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [response, authorList] = await Promise.all([
        audiobookService.getAudiobooks(filters),
        authors.length > 0
          ? Promise.resolve(authors)
          : audiobookService.getAuthors().catch(() => []),
      ]);

      setAudiobooks(response.items);
      if (authorList !== authors) setAuthors(authorList);
    } catch (err) {
      logger.error("Failed to load audiobooks", "AudiobooksPage", err);
      setError(t("audiobooks.loadError", "Failed to load audiobooks"));
      setAudiobooks([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    try {
      setSyncing(true);
      audiobookService.clearCache();
      prevBackendKey.current = "";
      await loadData();
    } catch (err) {
      logger.error("Failed to sync audiobooks", "AudiobooksPage", err);
    } finally {
      setSyncing(false);
    }
  };

  const handleFilterChange = (next: AudiobookFilters) => {
    // Reset to page 1 when author changes
    if (next.author !== filters.author) {
      next = { ...next, page: 1 };
    }
    setFilters(next);
  };

  if (loading && audiobooks.length === 0) {
    return (
      <PageLoading
        title={t("audiobooks.title", "Audiobooks")}
        pageType={"audiobooks" as any}
        message={t("audiobooks.loading", "Loading audiobooks...")}
        isRTL={isRTL}
      />
    );
  }

  return (
    <WidgetToggleProvider items={widgetItems}>
      <GlassView style={styles.container}>
        <ScrollView scrollEnabled={true} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <GlassPageHeader
              title={t("audiobooks.title", "Audiobooks")}
              pageType={"audiobooks" as any}
              badge={audiobooks.length}
              isRTL={isRTL}
            />
            <Pressable
              onPress={handleRefresh}
              disabled={syncing}
              style={[
                styles.refreshButton,
                syncing && styles.refreshButtonDisabled,
              ]}
            >
              <RefreshCw size={20} color={colors.text} />
            </Pressable>
          </View>

          {/* Search */}
          <GlassInput
            placeholder={t("common.search", "Search")}
            value={searchQuery}
            onChangeText={setSearchQuery}
            leftIcon={<Search size={18} color={colors.textMuted} />}
            rightIcon={
              searchQuery ? (
                <Pressable onPress={() => setSearchQuery("")}>
                  <X size={18} color={colors.textMuted} />
                </Pressable>
              ) : undefined
            }
            containerStyle={styles.searchContainer}
          />

          {/* Filters */}
          <AudiobooksPageFilters
            filters={filters}
            onChange={handleFilterChange}
            authors={authors}
            isRTL={isRTL}
          />

          {/* Error State */}
          {error && (
            <GlassEmptyState
              variant="error"
              title={t("common.error", "Error")}
              description={error}
            />
          )}

          {/* Grid */}
          {!error && (
            <AudiobooksPageGrid
              audiobooks={displayAudiobooks}
              loading={loading}
              currentPage={filters.page || 1}
              onPageChange={(page) => setFilters({ ...filters, page })}
              searchQuery={searchQuery}
            />
          )}
        </ScrollView>
      </GlassView>
    </WidgetToggleProvider>
  );
}

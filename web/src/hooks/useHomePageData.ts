import { useQueries, useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import api, {
  contentService,
  liveService,
  historyService,
  ritualService,
} from "@/services/api";
import { useAuthStore } from "@/stores/authStore";
import {
  getLocalizedName,
  getLocalizedDescription,
} from "@bayit/shared-utils/contentLocalization";
import { formatContentMetadata } from "@bayit/shared-utils/metadataFormatters";
import { getContentPosterUrl } from "@bayit/shared-utils/youtube";
import { isSeriesContent } from "@/utils/contentHelpers";

const STALE_5MIN = 5 * 60 * 1000;

export interface CarouselItem {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  image?: string;
  badge?: string;
  contentType?:
    | "vod"
    | "live"
    | "podcast"
    | "radio"
    | "movie"
    | "series"
    | "channel";
  /** @deprecated Use isSeriesContent() helper from @/utils/contentHelpers instead */
  is_series?: boolean;
  available_subtitle_languages?: string[];
  has_subtitles?: boolean;
}

export interface Channel {
  id: string;
  name: string;
  thumbnail?: string;
  logo?: string;
  currentShow?: string;
}

export interface ContentItem {
  id: string;
  title: string;
  thumbnail?: string;
  type?: string;
  duration?: string;
  year?: string;
  category?: string;
  category_name_en?: string;
  category_name_es?: string;
  /** @deprecated Use isSeriesContent() helper from @/utils/contentHelpers instead */
  is_series?: boolean;
  available_subtitle_languages?: string[];
  has_subtitles?: boolean;
  backdrop?: string;
  description?: string;
  total_episodes?: number;
  progress?: number;
}

export interface Category {
  id: string;
  name: string;
  name_key?: string;
  name_he?: string;
  name_en?: string;
  name_es?: string;
  items: ContentItem[];
}

export function useHomePageData() {
  const { t, i18n } = useTranslation();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const results = useQueries({
    queries: [
      {
        queryKey: ["home", "featured"],
        queryFn: () => contentService.getFeatured(),
        staleTime: STALE_5MIN,
      },
      {
        queryKey: ["home", "liveChannels"],
        queryFn: () => liveService.getChannels(),
        staleTime: STALE_5MIN,
      },
      {
        queryKey: ["home", "continueWatching"],
        queryFn: () => historyService.getContinueWatching(),
        staleTime: STALE_5MIN,
        enabled: isAuthenticated,
      },
      {
        queryKey: ["home", "collections"],
        queryFn: () => api.get("/content/collections/recommendations"),
        staleTime: STALE_5MIN,
      },
      {
        queryKey: ["home", "youngstersTrending"],
        queryFn: () => api.get("/youngsters/featured"),
        staleTime: STALE_5MIN,
      },
    ],
  });

  const [
    featuredResult,
    liveResult,
    continueResult,
    collectionsResult,
    youngstersResult,
  ] = results;

  const ritualResult = useQuery({
    queryKey: ["home", "morningRitual"],
    queryFn: () => ritualService.shouldShow(),
    staleTime: STALE_5MIN,
    enabled: isAuthenticated,
  });

  const featuredData = featuredResult.data;

  const spotlightItems: any[] = featuredData?.spotlight ?? [];
  const carouselItems: CarouselItem[] = spotlightItems.map(
    (item: any, index: number) => ({
      id: item.id,
      title: getLocalizedName(item, i18n.language),
      subtitle: formatContentMetadata(item),
      description: getLocalizedDescription(item, i18n.language),
      image: getContentPosterUrl(item) || item.backdrop || item.thumbnail,
      badge: index === 0 ? t("common.new") : undefined,
      contentType: isSeriesContent(item) ? "series" : "vod",
      is_series: isSeriesContent(item),
      available_subtitle_languages: item.available_subtitle_languages,
      has_subtitles: item.has_subtitles,
    }),
  );

  const categories: Category[] = featuredData?.categories ?? [];
  const liveChannels: Channel[] = liveResult.data?.channels ?? [];
  const continueWatching: ContentItem[] = continueResult.data?.items ?? [];
  const featuredCollections: any[] = Array.isArray(collectionsResult.data)
    ? collectionsResult.data
    : [];
  const youngstersTrending: ContentItem[] = youngstersResult.data?.items ?? [];
  const showMorningRitual = ritualResult.data?.show_ritual === true;

  return {
    carouselItems,
    carouselLoading: featuredResult.isLoading,
    categories,
    categoriesLoading: featuredResult.isLoading,
    liveChannels,
    liveLoading: liveResult.isLoading,
    continueWatching,
    continueLoading: isAuthenticated ? continueResult.isLoading : false,
    featuredCollections,
    youngstersTrending,
    youngstersLoading: youngstersResult.isLoading,
    showMorningRitual,
    refetchAll: () => results.forEach((r) => r.refetch()),
  };
}

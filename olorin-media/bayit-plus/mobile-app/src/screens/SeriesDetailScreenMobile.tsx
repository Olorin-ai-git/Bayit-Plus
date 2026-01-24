/**
 * SeriesDetailScreenMobile - Mobile-optimized series detail screen
 *
 * Features:
 * - Collapsible season selector (modal/bottom sheet)
 * - Horizontal scrollable episode list
 * - Optimized episode thumbnails
 * - RTL support
 * - Haptic feedback
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  SafeAreaView,
  Share,
  Dimensions,
  StatusBar,
  Modal,
  FlatList,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import LinearGradient from "react-native-linear-gradient";
import ReactNativeHapticFeedback from "react-native-haptic-feedback";
import { contentService } from "@bayit/shared-services";
import { getLocalizedName, getLocalizedDescription } from "@bayit/shared-utils";
import { useDirection } from "@bayit/shared-hooks";
import { spacing, colors, borderRadius } from "../theme";

import logger from '@/utils/logger';


const moduleLogger = logger.scope('SeriesDetailScreenMobile');

// Type assertion for LinearGradient React component
const LinearGradientComponent = LinearGradient as any as React.FC<any>;

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const HERO_HEIGHT = SCREEN_HEIGHT * 0.4;
const EPISODE_CARD_WIDTH = 280;

type SeriesDetailRouteParams = {
  SeriesDetail: {
    seriesId: string;
  };
};

interface Season {
  season_number: number;
  episode_count: number;
}

interface Episode {
  id: string;
  title: string;
  title_en?: string;
  title_es?: string;
  description?: string;
  description_en?: string;
  description_es?: string;
  thumbnail?: string;
  episode_number: number;
  duration?: string;
  preview_url?: string;
}

interface SeriesData {
  id: string;
  title: string;
  title_en?: string;
  title_es?: string;
  description?: string;
  description_en?: string;
  description_es?: string;
  thumbnail?: string;
  backdrop?: string;
  category?: string;
  year?: number;
  rating?: string;
  genre?: string;
  cast?: string[];
  total_seasons: number;
  total_episodes: number;
  trailer_url?: string;
  preview_url?: string;
  seasons: Season[];
}

interface CastMember {
  id: string;
  name: string;
  character: string;
  photo?: string;
}

interface EpisodeCardProps {
  episode: Episode;
  onPress: () => void;
  isSelected: boolean;
  getLocalizedText: (item: any, field: string) => string;
}

const EpisodeCard: React.FC<EpisodeCardProps> = ({
  episode,
  onPress,
  isSelected,
  getLocalizedText,
}) => {
  const { textAlign } = useDirection();

  return (
    <TouchableOpacity
      onPress={() => {
        ReactNativeHapticFeedback.trigger("impactLight");
        onPress();
      }}
      className={`rounded-lg overflow-hidden bg-white/5 ${isSelected ? 'border-2 border-purple-600' : ''}`}
      style={{ width: EPISODE_CARD_WIDTH, marginRight: spacing.md }}
      activeOpacity={0.8}
    >
      <Image
        source={{ uri: episode.thumbnail }}
        className="bg-white/5"
        style={{ width: EPISODE_CARD_WIDTH, height: 157 }}
        resizeMode="cover"
      />
      <View className="absolute top-0 left-0 right-0 justify-between items-start p-2" style={{ height: 157 }}>
        <View className="bg-black/70 px-2 py-1 rounded">
          <Text className="text-xs font-semibold text-white">{episode.episode_number}</Text>
        </View>
        <TouchableOpacity className="absolute top-1/2 left-1/2 -mt-5 -ml-5 w-10 h-10 rounded-full bg-purple-600/90 justify-center items-center" onPress={onPress}>
          <Text className="text-base text-white ml-0.5">▶</Text>
        </TouchableOpacity>
      </View>
      <View className="p-2">
        <Text className="text-sm font-medium text-white mb-1" style={{ textAlign }} numberOfLines={1}>
          {getLocalizedText(episode, "title")}
        </Text>
        {episode.duration && (
          <Text className="text-xs text-white/60" style={{ textAlign }}>
            {episode.duration}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
};

export const SeriesDetailScreenMobile: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { isRTL, textAlign } = useDirection();
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<SeriesDetailRouteParams, "SeriesDetail">>();
  const { seriesId } = route.params;
  const currentLang = i18n.language;

  const [series, setSeries] = useState<SeriesData | null>(null);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [selectedEpisode, setSelectedEpisode] = useState<Episode | null>(null);
  const [loading, setLoading] = useState(true);
  const [episodesLoading, setEpisodesLoading] = useState(false);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [castMembers, setCastMembers] = useState<CastMember[]>([]);
  const [showSeasonPicker, setShowSeasonPicker] = useState(false);
  const [isInWatchlist, setIsInWatchlist] = useState(false);

  const getLocalizedText = useCallback(
    (item: any, field: string): string => {
      if (field === "title") return getLocalizedName(item, currentLang);
      if (field === "description")
        return getLocalizedDescription(item, currentLang);
      if (currentLang === "he") return item[field] || item.title || item.name;
      if (currentLang === "es")
        return item[`${field}_es`] || item[`${field}_en`] || item[field];
      return item[`${field}_en`] || item[field];
    },
    [currentLang],
  );

  useEffect(() => {
    loadSeriesDetails();
  }, [seriesId]);

  useEffect(() => {
    if (selectedSeason) {
      loadSeasonEpisodes();
    }
  }, [seriesId, selectedSeason]);

  const loadSeriesDetails = async () => {
    setLoading(true);
    try {
      const data = await contentService.getSeriesDetails(seriesId);
      setSeries(data);
      if (data.seasons && data.seasons.length > 0) {
        setSelectedSeason(data.seasons[0].season_number);
      }

      // Format cast data if available
      if (data.cast && Array.isArray(data.cast)) {
        const formattedCast = data.cast.map((name: string, index: number) => ({
          id: `cast-${index}`,
          name,
          character: "",
          photo: undefined,
        }));
        setCastMembers(formattedCast);
      }

      // Load recommendations
      try {
        const recs = await contentService.getRecommendations?.(seriesId);
        if (recs && Array.isArray(recs)) {
          setRecommendations(recs);
        }
      } catch {
        // Non-blocking error
      }
    } catch (error) {
      moduleLogger.error("Failed to load series:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadSeasonEpisodes = async () => {
    setEpisodesLoading(true);
    try {
      const data = await contentService.getSeasonEpisodes(
        seriesId,
        selectedSeason,
      );
      setEpisodes(data.episodes || []);
      if (data.episodes && data.episodes.length > 0 && !selectedEpisode) {
        setSelectedEpisode(data.episodes[0]);
      }
    } catch (error) {
      moduleLogger.error("Failed to load episodes:", error);
    } finally {
      setEpisodesLoading(false);
    }
  };

  const handlePlay = useCallback(() => {
    if (selectedEpisode) {
      ReactNativeHapticFeedback.trigger("impactMedium");
      navigation.navigate("Player", {
        id: selectedEpisode.id,
        title: getLocalizedText(selectedEpisode, "title"),
        type: "vod",
      });
    }
  }, [selectedEpisode, navigation, getLocalizedText]);

  const handleEpisodePlay = useCallback(
    (episode: Episode) => {
      ReactNativeHapticFeedback.trigger("impactMedium");
      navigation.navigate("Player", {
        id: episode.id,
        title: getLocalizedText(episode, "title"),
        type: "vod",
      });
    },
    [navigation, getLocalizedText],
  );

  const handleEpisodeSelect = useCallback((episode: Episode) => {
    setSelectedEpisode(episode);
  }, []);

  const handleSeasonChange = useCallback((seasonNumber: number) => {
    ReactNativeHapticFeedback.trigger("selection");
    setSelectedSeason(seasonNumber);
    setSelectedEpisode(null);
    setShowSeasonPicker(false);
  }, []);

  const handleShare = useCallback(async () => {
    if (series) {
      ReactNativeHapticFeedback.trigger("impactLight");
      try {
        await Share.share({
          message: `${t("share.checkOut", "Check out")} "${getLocalizedText(series, "title")}" ${t("share.onBayitPlus", "on Bayit+")}`,
          title: getLocalizedText(series, "title"),
        });
      } catch (error) {
        moduleLogger.error("Share failed:", error);
      }
    }
  }, [series, t, getLocalizedText]);

  const handleBack = useCallback(() => {
    ReactNativeHapticFeedback.trigger("impactLight");
    navigation.goBack();
  }, [navigation]);

  const handleRecommendationPress = useCallback(
    (item: any) => {
      ReactNativeHapticFeedback.trigger("impactLight");
      navigation.push("SeriesDetail", { seriesId: item.id });
    },
    [navigation],
  );

  const handleToggleWatchlist = useCallback(() => {
    ReactNativeHapticFeedback.trigger("impactLight");
    setIsInWatchlist(!isInWatchlist);
  }, [isInWatchlist]);

  if (loading) {
    return (
      <SafeAreaView className="flex-1 justify-center items-center bg-black">
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  if (!series) {
    return (
      <SafeAreaView className="flex-1 justify-center items-center bg-black p-6">
        <Text className="text-lg text-white/60 mb-6">
          {t("content.notFound", "Content not found")}
        </Text>
        <TouchableOpacity onPress={handleBack} className="px-6 py-3 bg-purple-600 rounded-lg">
          <Text className="text-white font-semibold">
            {t("common.goBack", "Go Back")}
          </Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <View className="flex-1 bg-black">
      <StatusBar barStyle="light-content" />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section */}
        <View style={styles.heroContainer}>
          <Image
            source={{
              uri:
                selectedEpisode?.thumbnail ||
                series.backdrop ||
                series.thumbnail,
            }}
            style={styles.heroImage}
            resizeMode="cover"
          />
          <LinearGradientComponent
            colors={["transparent", "rgba(0,0,0,0.7)", colors.background]}
            locations={[0.3, 0.7, 1]}
            style={styles.heroGradient}
          />

          {/* Header Actions */}
          <SafeAreaView style={styles.headerActions}>
            <TouchableOpacity onPress={handleBack} style={styles.headerButton}>
              <Text style={styles.headerButtonIcon}>←</Text>
            </TouchableOpacity>
            <View style={styles.headerRightActions}>
              <TouchableOpacity
                onPress={handleShare}
                style={styles.headerButton}
              >
                <Text style={styles.headerButtonIcon}>⤴</Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>

          {/* Hero Content */}
          <View style={styles.heroContent}>
            <Text style={[styles.seriesTitle, { textAlign }]}>
              {getLocalizedText(series, "title")}
            </Text>

            {/* Metadata */}
            <View
              style={[
                styles.metadataRow,
                { flexDirection: isRTL ? "row-reverse" : "row" },
              ]}
            >
              {series.year && (
                <Text style={styles.metadataText}>{series.year}</Text>
              )}
              {series.rating && (
                <>
                  <Text style={styles.metadataDot}>•</Text>
                  <Text style={styles.metadataText}>{series.rating}</Text>
                </>
              )}
              {series.total_seasons > 0 && (
                <>
                  <Text style={styles.metadataDot}>•</Text>
                  <Text style={styles.metadataText}>
                    {series.total_seasons} {t("content.seasons", "Seasons")}
                  </Text>
                </>
              )}
            </View>
          </View>
        </View>

        {/* Content Section */}
        <View style={styles.content}>
          {/* Season Selector */}
          <TouchableOpacity
            style={styles.seasonSelector}
            onPress={() => {
              ReactNativeHapticFeedback.trigger("impactLight");
              setShowSeasonPicker(true);
            }}
          >
            <Text style={styles.seasonSelectorLabel}>
              {t("content.season", "Season")} {selectedSeason}
            </Text>
            <Text style={styles.seasonSelectorArrow}>▼</Text>
          </TouchableOpacity>

          {/* Episodes */}
          <View style={styles.episodesSection}>
            <Text style={[styles.sectionTitle, { textAlign }]}>
              {t("content.episodes", "Episodes")}
            </Text>
            {episodesLoading ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <FlatList
                data={episodes}
                keyExtractor={(item) => item.id}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={[
                  styles.episodesList,
                  { flexDirection: isRTL ? "row-reverse" : "row" },
                ]}
                renderItem={({ item }) => (
                  <EpisodeCard
                    episode={item}
                    onPress={() => handleEpisodePlay(item)}
                    isSelected={selectedEpisode?.id === item.id}
                    getLocalizedText={getLocalizedText}
                  />
                )}
              />
            )}
          </View>

          {/* Quick Actions */}
          <View
            style={[
              styles.quickActions,
              { flexDirection: isRTL ? "row-reverse" : "row" },
            ]}
          >
            <TouchableOpacity
              onPress={handleToggleWatchlist}
              style={styles.quickActionButton}
            >
              <Text style={styles.quickActionIcon}>
                {isInWatchlist ? "✓" : "+"}
              </Text>
              <Text style={styles.quickActionLabel}>
                {t("content.myList", "My List")}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleShare}
              style={styles.quickActionButton}
            >
              <Text style={styles.quickActionIcon}>⤴</Text>
              <Text style={styles.quickActionLabel}>
                {t("content.share", "Share")}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Synopsis */}
          {series.description && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { textAlign }]}>
                {t("content.synopsis", "Synopsis")}
              </Text>
              <Text style={[styles.synopsisText, { textAlign }]}>
                {getLocalizedText(series, "description")}
              </Text>
            </View>
          )}

          {/* Cast */}
          {castMembers.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { textAlign }]}>
                {t("content.cast", "Cast")}
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={[
                  styles.castContainer,
                  { flexDirection: isRTL ? "row-reverse" : "row" },
                ]}
              >
                {castMembers.map((member) => (
                  <View key={member.id} style={styles.castCard}>
                    <View style={styles.castAvatar}>
                      <Text style={styles.castInitial}>
                        {member.name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <Text style={styles.castName} numberOfLines={1}>
                      {member.name}
                    </Text>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Recommendations */}
          {recommendations.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { textAlign }]}>
                {t("content.moreLikeThis", "More Like This")}
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={[
                  styles.recommendationsContainer,
                  { flexDirection: isRTL ? "row-reverse" : "row" },
                ]}
              >
                {recommendations.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.recommendationCard}
                    onPress={() => handleRecommendationPress(item)}
                    activeOpacity={0.7}
                  >
                    <Image
                      source={{ uri: item.thumbnail }}
                      style={styles.recommendationImage}
                      resizeMode="cover"
                    />
                    <Text style={styles.recommendationTitle} numberOfLines={2}>
                      {getLocalizedText(item, "title")}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Bottom spacing for fixed button */}
          <View style={styles.bottomSpacer} />
        </View>
      </ScrollView>

      {/* Fixed Watch Button */}
      <SafeAreaView style={styles.fixedButtonContainer}>
        <TouchableOpacity
          onPress={handlePlay}
          style={styles.watchButton}
          activeOpacity={0.8}
          disabled={!selectedEpisode}
        >
          <LinearGradientComponent
            colors={
              selectedEpisode
                ? [colors.primary, colors.primaryDark]
                : [colors.textSecondary, colors.textSecondary]
            }
            style={styles.watchButtonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={styles.watchButtonIcon}>▶</Text>
            <Text style={styles.watchButtonText}>
              {selectedEpisode
                ? `${t("content.play", "Play")} S${selectedSeason}:E${selectedEpisode.episode_number}`
                : t("content.selectEpisode", "Select Episode")}
            </Text>
          </LinearGradientComponent>
        </TouchableOpacity>
      </SafeAreaView>

      {/* Season Picker Modal */}
      <Modal
        visible={showSeasonPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSeasonPicker(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowSeasonPicker(false)}
        >
          <View style={styles.seasonPickerContainer}>
            <View style={styles.seasonPickerHeader}>
              <Text style={styles.seasonPickerTitle}>
                {t("content.selectSeason", "Select Season")}
              </Text>
              <TouchableOpacity onPress={() => setShowSeasonPicker(false)}>
                <Text style={styles.seasonPickerClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.seasonList}>
              {series.seasons.map((season) => (
                <TouchableOpacity
                  key={season.season_number}
                  style={[
                    styles.seasonItem,
                    selectedSeason === season.season_number &&
                      styles.seasonItemSelected,
                  ]}
                  onPress={() => handleSeasonChange(season.season_number)}
                >
                  <Text
                    style={[
                      styles.seasonItemText,
                      selectedSeason === season.season_number &&
                        styles.seasonItemTextSelected,
                    ]}
                  >
                    {t("content.season", "Season")} {season.season_number}
                  </Text>
                  <Text style={styles.seasonItemEpisodes}>
                    {season.episode_count} {t("content.episodes", "episodes")}
                  </Text>
                  {selectedSeason === season.season_number && (
                    <Text style={styles.seasonItemCheck}>✓</Text>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

export default SeriesDetailScreenMobile;

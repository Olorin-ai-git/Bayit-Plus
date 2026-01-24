/**
 * MovieDetailScreenMobile - Mobile-optimized movie detail screen
 *
 * Features:
 * - Vertical scroll layout
 * - Full-width hero with gradient overlay
 * - Bottom sticky "Watch Now" button
 * - Share/download actions in header
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


const moduleLogger = logger.scope('MovieDetailScreenMobile');

// Type assertion for LinearGradient React component
const LinearGradientComponent = LinearGradient as any as React.FC<any>;

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const HERO_HEIGHT = SCREEN_HEIGHT * 0.45;

type MovieDetailRouteParams = {
  MovieDetail: {
    movieId: string;
  };
};

interface MovieData {
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
  duration?: string;
  year?: number;
  rating?: string;
  genre?: string;
  cast?: string[];
  director?: string;
  trailer_url?: string;
  preview_url?: string;
  imdb_rating?: number;
  imdb_votes?: number;
}

interface CastMember {
  id: string;
  name: string;
  character: string;
  photo?: string;
}

const formatVotes = (votes?: number): string => {
  if (!votes) return "";
  if (votes >= 1000000) return `${(votes / 1000000).toFixed(1)}M`;
  if (votes >= 1000) return `${(votes / 1000).toFixed(0)}K`;
  return votes.toString();
};

export const MovieDetailScreenMobile: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { isRTL, textAlign } = useDirection();
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<MovieDetailRouteParams, "MovieDetail">>();
  const { movieId } = route.params;
  const currentLang = i18n.language;

  const [movie, setMovie] = useState<MovieData | null>(null);
  const [loading, setLoading] = useState(true);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [castMembers, setCastMembers] = useState<CastMember[]>([]);
  const [isInWatchlist, setIsInWatchlist] = useState(false);
  const [isInFavorites, setIsInFavorites] = useState(false);

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
    loadMovieDetails();
  }, [movieId]);

  const loadMovieDetails = async () => {
    setLoading(true);
    try {
      const data = await contentService.getMovieDetails(movieId);
      setMovie(data);

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

      // Load recommendations in parallel
      try {
        const recs = await contentService.getRecommendations?.(movieId);
        if (recs && Array.isArray(recs)) {
          setRecommendations(recs);
        }
      } catch {
        // Non-blocking error - continue without recommendations
      }
    } catch (error) {
      moduleLogger.error("Failed to load movie:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePlay = useCallback(() => {
    if (movie) {
      ReactNativeHapticFeedback.trigger("impactMedium");
      navigation.navigate("Player", {
        id: movie.id,
        title: getLocalizedText(movie, "title"),
        type: "vod",
      });
    }
  }, [movie, navigation, getLocalizedText]);

  const handleShare = useCallback(async () => {
    if (movie) {
      ReactNativeHapticFeedback.trigger("impactLight");
      try {
        await Share.share({
          message: `${t("share.checkOut", "Check out")} "${getLocalizedText(movie, "title")}" ${t("share.onBayitPlus", "on Bayit+")}`,
          title: getLocalizedText(movie, "title"),
        });
      } catch (error) {
        moduleLogger.error("Share failed:", error);
      }
    }
  }, [movie, t, getLocalizedText]);

  const handleToggleWatchlist = useCallback(() => {
    ReactNativeHapticFeedback.trigger("impactLight");
    setIsInWatchlist(!isInWatchlist);
    // Call API to add/remove from watchlist
  }, [isInWatchlist]);

  const handleToggleFavorites = useCallback(() => {
    ReactNativeHapticFeedback.trigger("impactLight");
    setIsInFavorites(!isInFavorites);
    // Call API to add/remove from favorites
  }, [isInFavorites]);

  const handleBack = useCallback(() => {
    ReactNativeHapticFeedback.trigger("impactLight");
    navigation.goBack();
  }, [navigation]);

  const handleRecommendationPress = useCallback(
    (item: any) => {
      ReactNativeHapticFeedback.trigger("impactLight");
      navigation.push("MovieDetail", { movieId: item.id });
    },
    [navigation],
  );

  if (loading) {
    return (
      <SafeAreaView className="flex-1 justify-center items-center bg-black">
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  if (!movie) {
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
        className="flex-1"
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section */}
        <View className="relative" style={{ height: HERO_HEIGHT }}>
          <Image
            source={{ uri: movie.backdrop || movie.thumbnail }}
            className="absolute"
            style={{ width: SCREEN_WIDTH, height: HERO_HEIGHT }}
            resizeMode="cover"
          />
          <LinearGradientComponent
            colors={["transparent", "rgba(0,0,0,0.7)", colors.background]}
            locations={[0.3, 0.7, 1]}
            className="absolute left-0 right-0 bottom-0"
            style={{ height: HERO_HEIGHT }}
          />

          {/* Header Actions */}
          <SafeAreaView className="absolute top-0 left-0 right-0 flex-row justify-between items-center px-3 pt-2">
            <TouchableOpacity onPress={handleBack} className="w-11 h-11 rounded-full bg-black/50 justify-center items-center">
              <Text className="text-xl text-white">←</Text>
            </TouchableOpacity>
            <View className="flex-row gap-2">
              <TouchableOpacity
                onPress={handleShare}
                className="w-11 h-11 rounded-full bg-black/50 justify-center items-center"
              >
                <Text className="text-xl text-white">⤴</Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>

          {/* Hero Content */}
          <View className="absolute bottom-0 left-0 right-0 px-3 pb-3">
            <Text className="text-[28px] font-bold text-white mb-2" style={{ textAlign }}>
              {getLocalizedText(movie, "title")}
            </Text>

            {/* Metadata */}
            <View
              className="flex-row items-center flex-wrap mb-2"
              style={{ flexDirection: isRTL ? "row-reverse" : "row" }}
            >
              {movie.year && (
                <Text className="text-sm text-white/60">{movie.year}</Text>
              )}
              {movie.rating && (
                <>
                  <Text className="text-sm text-white/60 mx-1">•</Text>
                  <Text className="text-sm text-white/60">{movie.rating}</Text>
                </>
              )}
              {movie.duration && (
                <>
                  <Text className="text-sm text-white/60 mx-1">•</Text>
                  <Text className="text-sm text-white/60">{movie.duration}</Text>
                </>
              )}
              {movie.genre && (
                <>
                  <Text className="text-sm text-white/60 mx-1">•</Text>
                  <Text className="text-sm text-white/60">{movie.genre}</Text>
                </>
              )}
            </View>

            {/* IMDb Rating */}
            {movie.imdb_rating && (
              <View
                className="flex-row items-center"
                style={{ flexDirection: isRTL ? "row-reverse" : "row" }}
              >
                <View className="flex-row items-center bg-[#f5c518] px-2 py-1 rounded gap-1">
                  <Text className="text-xs font-bold text-black">IMDb</Text>
                  <Text className="text-sm font-bold text-black">
                    {movie.imdb_rating.toFixed(1)}
                  </Text>
                </View>
                {movie.imdb_votes && (
                  <Text className="text-xs text-white/60 ml-2">
                    ({formatVotes(movie.imdb_votes)} votes)
                  </Text>
                )}
              </View>
            )}
          </View>
        </View>

        {/* Content Section */}
        <View className="px-3 pt-6">
          {/* Quick Actions */}
          <View
            className="flex-row justify-center gap-8 pb-6 border-b border-white/10"
            style={{ flexDirection: isRTL ? "row-reverse" : "row" }}
          >
            <TouchableOpacity
              onPress={handleToggleWatchlist}
              className="items-center min-w-[60px]"
            >
              <Text className="text-2xl mb-1">
                {isInWatchlist ? "✓" : "+"}
              </Text>
              <Text className="text-xs text-white/60">
                {t("content.myList", "My List")}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleToggleFavorites}
              className="items-center min-w-[60px]"
            >
              <Text className="text-2xl mb-1">
                {isInFavorites ? "❤️" : "🤍"}
              </Text>
              <Text className="text-xs text-white/60">
                {t("content.favorite", "Favorite")}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleShare}
              className="items-center min-w-[60px]"
            >
              <Text className="text-2xl mb-1">⤴</Text>
              <Text className="text-xs text-white/60">
                {t("content.share", "Share")}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Synopsis */}
          {movie.description && (
            <View className="mt-6">
              <Text className="text-lg font-semibold text-white mb-2" style={{ textAlign }}>
                {t("content.synopsis", "Synopsis")}
              </Text>
              <Text className="text-sm text-white/60 leading-[22px]" style={{ textAlign }}>
                {getLocalizedText(movie, "description")}
              </Text>
            </View>
          )}

          {/* Director */}
          {movie.director && (
            <View className="mt-6">
              <Text className="text-lg font-semibold text-white mb-2" style={{ textAlign }}>
                {t("content.director", "Director")}
              </Text>
              <Text className="text-base text-white" style={{ textAlign }}>
                {movie.director}
              </Text>
            </View>
          )}

          {/* Cast */}
          {castMembers.length > 0 && (
            <View className="mt-6">
              <Text className="text-lg font-semibold text-white mb-2" style={{ textAlign }}>
                {t("content.cast", "Cast")}
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: spacing.md, paddingVertical: spacing.xs, flexDirection: isRTL ? "row-reverse" : "row" }}
              >
                {castMembers.map((member) => (
                  <View key={member.id} className="items-center w-[70px]">
                    <View className="w-14 h-14 rounded-full bg-white/5 justify-center items-center mb-1">
                      <Text className="text-[22px] font-semibold text-purple-600">
                        {member.name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <Text className="text-xs text-white/60 text-center" numberOfLines={1}>
                      {member.name}
                    </Text>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Recommendations */}
          {recommendations.length > 0 && (
            <View className="mt-6">
              <Text className="text-lg font-semibold text-white mb-2" style={{ textAlign }}>
                {t("content.moreLikeThis", "More Like This")}
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: spacing.md, paddingVertical: spacing.xs, flexDirection: isRTL ? "row-reverse" : "row" }}
              >
                {recommendations.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    className="w-[120px]"
                    onPress={() => handleRecommendationPress(item)}
                    activeOpacity={0.7}
                  >
                    <Image
                      source={{ uri: item.thumbnail }}
                      className="w-[120px] h-[68px] rounded-lg mb-1 bg-white/5"
                      resizeMode="cover"
                    />
                    <Text className="text-xs text-white/60 leading-4" numberOfLines={2}>
                      {getLocalizedText(item, "title")}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Bottom spacing for fixed button */}
          <View className="h-[100px]" />
        </View>
      </ScrollView>

      {/* Fixed Watch Button */}
      <SafeAreaView className="absolute bottom-0 left-0 right-0 bg-black px-3 pt-2 pb-3 border-t border-white/10">
        <TouchableOpacity
          onPress={handlePlay}
          className="rounded-2xl overflow-hidden"
          activeOpacity={0.8}
        >
          <LinearGradientComponent
            colors={[colors.primary, colors.primaryDark]}
            className="flex-row items-center justify-center py-3 gap-2"
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text className="text-lg text-white">▶</Text>
            <Text className="text-base font-semibold text-white">
              {t("content.watchNow", "Watch Now")}
            </Text>
          </LinearGradientComponent>
        </TouchableOpacity>
      </SafeAreaView>
    </View>
  );
};

export default MovieDetailScreenMobile;

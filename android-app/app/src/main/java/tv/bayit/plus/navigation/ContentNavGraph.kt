package tv.bayit.plus.navigation

import androidx.compose.ui.res.stringResource
import androidx.navigation.NavController
import androidx.navigation.NavGraphBuilder
import androidx.navigation.compose.composable
import androidx.navigation.toRoute
import tv.bayit.plus.feature.audiobooks.AudiobooksRoute
import tv.bayit.plus.feature.audiobooks.detail.AudiobookDetailRoute
import tv.bayit.plus.feature.home.HomeRoute
import tv.bayit.plus.feature.livetv.LiveTVRoute
import tv.bayit.plus.feature.livetv.epg.EPGRoute
import tv.bayit.plus.feature.player.PlayerRoute
import tv.bayit.plus.feature.player.chapters.ChaptersRoute
import tv.bayit.plus.feature.player.subtitles.InteractiveSubtitlesRoute
import tv.bayit.plus.feature.podcasts.PodcastsRoute
import tv.bayit.plus.feature.podcasts.detail.PodcastDetailRoute
import tv.bayit.plus.feature.radio.RadioRoute
import tv.bayit.plus.feature.search.SearchRoute
import tv.bayit.plus.feature.search.llm.LLMSearchRoute
import tv.bayit.plus.feature.vod.VodRoute
import tv.bayit.plus.feature.vod.collection.CollectionDetailRoute
import tv.bayit.plus.feature.onboarding.FeatureTourRoute
import tv.bayit.plus.feature.onboarding.intro.OnboardingIntroRoute
import tv.bayit.plus.feature.onboarding.R as OnboardingR
import tv.bayit.plus.feature.discover.ui.DiscoverRoute
import tv.bayit.plus.feature.vod.detail.MovieDetailRoute
import tv.bayit.plus.feature.vod.favorites.FavoritesRoute
import tv.bayit.plus.feature.vod.playlist.PlaylistRoute
import tv.bayit.plus.feature.vod.recordings.RecordingsRoute
import tv.bayit.plus.feature.vod.series.SeriesDetailRoute
import tv.bayit.plus.feature.discover.ui.DiscoverRoute
import tv.bayit.plus.feature.vod.trending.TrendingRoute

fun NavGraphBuilder.contentNavGraph(navController: NavController) {
    composable<Route.Home> {
        HomeRoute(
            onNavigateToContent = { id, type -> navController.navigateToContent(id, type) },
            onNavigateToPlayer = { id, type -> navController.navigate(Route.Player(contentId = id, contentType = type)) },
            onNavigateToContinueWatchingItem = { id, type, posMs -> navController.navigate(Route.Player(contentId = id, contentType = type, resumePositionMs = posMs)) },
            onNavigateToChannel = { channelId -> navController.navigate(Route.Player(contentId = channelId, contentType = "live")) },
            onNavigateToRadio = { radioId -> navController.navigate(Route.Player(contentId = radioId, contentType = "radio")) },
            onNavigateToYoungsters = { navController.navigate(Route.Youngsters) },
            onNavigateToJerusalem = { navController.navigate(Route.JerusalemContent) },
            onNavigateToTelAviv = { navController.navigate(Route.TelAvivContent) },
            onNavigateToContinueWatchingAll = { navController.navigate(Route.Vod) },
            onNavigateToLiveTV = { navController.navigate(Route.LiveTV) },
            onNavigateToRadioBrowse = { navController.navigate(Route.Radio) },
            onNavigateToTrending = { navController.navigate(Route.Trending) },
            onNavigateToCategoryBrowse = { categoryId -> navController.navigate(Route.CategoryBrowse(categoryId = categoryId)) },
            onNavigateToIsraelisCity = { navController.navigate(Route.Culture) },
            onNavigateToIsraeliBusinesses = { navController.navigate(Route.Culture) },
            onNavigateToBYOCSettings = { navController.navigate(Route.BYOCSettings) },
            onNavigateToBYOCPlayer = { id, _ -> navController.navigate(Route.Player(contentId = id, contentType = "byoc")) },
            onNavigateToFeatureTour = { navController.navigate(Route.FeatureTour) },
        )
    }
    composable<Route.LiveTV> {
        LiveTVRoute(onNavigateToPlayer = { id, type -> navController.navigate(Route.Player(contentId = id, contentType = type)) })
    }
    composable<Route.Vod> {
        VodRoute(
            onNavigateToContent = { id, type -> navController.navigateToContent(id, type) },
            onNavigateToPlayer = { id, type -> navController.navigate(Route.Player(contentId = id, contentType = type)) },
        )
    }
    composable<Route.CategoryBrowse> {
        VodRoute(
            onNavigateToContent = { id, type -> navController.navigateToContent(id, type) },
            onNavigateToPlayer = { id, type -> navController.navigate(Route.Player(contentId = id, contentType = type)) },
        )
    }
    composable<Route.Radio> {
        RadioRoute(onNavigateToPlayer = { id, type -> navController.navigate(Route.Player(contentId = id, contentType = type)) })
    }
    composable<Route.Podcasts> {
        PodcastsRoute(onNavigateToPodcast = { id -> navController.navigate(Route.PodcastDetail(showId = id)) })
    }
    composable<Route.Discover> {
        DiscoverRoute(
            onNavigateToPlayer = { id, type -> navController.navigate(Route.Player(contentId = id, contentType = type)) },
            onNavigateToZehAni = { navController.navigate(Route.ZehAni) },
        )
    }
    composable<Route.Search> {
        SearchRoute(onNavigateToContent = { id, type -> navController.navigateToContent(id, type) })
    }
    composable<Route.Discover> {
        DiscoverRoute(
            onNavigateToPlayer = { id, type ->
                navController.navigate(Route.Player(contentId = id, contentType = type))
            },
            onNavigateToZehAni = { navController.navigate(Route.ZehAni) },
            onNavigateToFeatureDetail = { featureId ->
                when (featureId) {
                    "glossary" -> navController.navigate(Route.Glossary)
                    "llm_search" -> navController.navigate(Route.LlmSearch)
                    "chatbot" -> navController.navigate(Route.Chatbot)
                    "interactive_mission" -> navController.navigate(Route.MissionsDashboard)
                    else -> navController.navigate(Route.Search)
                }
            },
        )
    }
    composable<Route.Player> { entry ->
        val route = entry.toRoute<Route.Player>()
        val tooltipKey = if (route.contentType == "live") "live_dubbing" else "pause_and_ask"
        val tooltipMsg = if (route.contentType == "live") {
            stringResource(OnboardingR.string.tooltip_live_dubbing)
        } else {
            stringResource(OnboardingR.string.tooltip_pause_and_ask)
        }
        WithFeatureTooltip(featureKey = tooltipKey, message = tooltipMsg) {
            PlayerRoute(
                contentId = route.contentId,
                contentType = route.contentType,
                resumePositionMs = route.resumePositionMs,
                onNavigateBack = { navController.popBackStack() },
            )
        }
    }
    composable<Route.MovieDetail> {
        MovieDetailRoute(
            onNavigateToPlayer = { id -> navController.navigate(Route.Player(contentId = id, contentType = "movie")) },
            onNavigateToRelated = { id -> navController.navigate(Route.MovieDetail(movieId = id)) },
            onNavigateBack = { navController.popBackStack() },
        )
    }
    composable<Route.SeriesDetail> {
        SeriesDetailRoute(
            onNavigateToPlayer = { id -> navController.navigate(Route.Player(contentId = id, contentType = "episode")) },
            onNavigateToRelated = { id -> navController.navigate(Route.SeriesDetail(seriesId = id)) },
            onNavigateBack = { navController.popBackStack() },
        )
    }
    composable<Route.CollectionDetail> {
        CollectionDetailRoute(
            onNavigateToMovie = { id -> navController.navigate(Route.MovieDetail(movieId = id)) },
            onNavigateToPlayer = { movieId -> navController.navigate(Route.Player(contentId = movieId, contentType = "movie")) },
            onNavigateBack = { navController.popBackStack() },
        )
    }
    composable<Route.PodcastDetail> {
        PodcastDetailRoute(
            onNavigateToPlayer = { id, type -> navController.navigate(Route.Player(contentId = id, contentType = type)) },
            onNavigateBack = { navController.popBackStack() },
        )
    }
    composable<Route.AudiobookDetail> {
        AudiobookDetailRoute(
            onNavigateToPlayer = { id, type -> navController.navigate(Route.Player(contentId = id, contentType = type)) },
            onNavigateBack = { navController.popBackStack() },
        )
    }
    composable<Route.Audiobooks> {
        AudiobooksRoute(onNavigateToAudiobook = { id -> navController.navigate(Route.AudiobookDetail(audiobookId = id)) })
    }
    composable<Route.Epg> {
        WithFeatureTooltip(featureKey = "catchup", message = stringResource(OnboardingR.string.tooltip_catchup)) {
            EPGRoute(
                onNavigateToChannel = { channelId -> navController.navigate(Route.Player(contentId = channelId, contentType = "live")) },
                onNavigateBack = { navController.popBackStack() },
            )
        }
    }
    composable<Route.Trending> {
        TrendingRoute(onNavigateToContent = { id, type -> navController.navigateToContent(id, type) })
    }
    composable<Route.LlmSearch> {
        LLMSearchRoute(
            onNavigateToContent = { id, type -> navController.navigateToContent(id, type) },
            onNavigateBack = { navController.popBackStack() },
        )
    }
    composable<Route.Favorites> {
        FavoritesRoute(
            onNavigateToContent = { id, type -> navController.navigateToContent(id, type) },
            onNavigateBack = { navController.popBackStack() },
        )
    }
    composable<Route.Playlist> {
        PlaylistRoute(
            onNavigateToContent = { id, type -> navController.navigateToContent(id, type) },
            onNavigateBack = { navController.popBackStack() },
        )
    }
    composable<Route.Recordings> {
        RecordingsRoute(onNavigateToPlayer = { id, type -> navController.navigate(Route.Player(contentId = id, contentType = type)) })
    }
    composable<Route.InteractiveSubtitles> {
        InteractiveSubtitlesRoute(onNavigateBack = { navController.popBackStack() })
    }
    composable<Route.Chapters> {
        ChaptersRoute(onNavigateBack = { navController.popBackStack() })
    }
    composable<Route.FeatureTour> {
        FeatureTourRoute(onComplete = { navController.popBackStack() })
    }
    composable<Route.OnboardingIntro> {
        OnboardingIntroRoute(
            onComplete = {
                navController.navigate(Route.Home) {
                    popUpTo(Route.OnboardingIntro) { inclusive = true }
                }
            },
        )
    }
}

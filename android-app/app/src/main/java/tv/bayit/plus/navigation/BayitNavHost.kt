package tv.bayit.plus.navigation

import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.navigation.NavController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.toRoute
import tv.bayit.plus.designsystem.component.GlassLoadingIndicator
import tv.bayit.plus.feature.auth.register.RegisterRoute
import tv.bayit.plus.feature.home.HomeRoute
import tv.bayit.plus.feature.livetv.LiveTVRoute
import tv.bayit.plus.feature.player.PlayerRoute
import tv.bayit.plus.feature.podcasts.PodcastsRoute
import tv.bayit.plus.feature.profile.selection.ProfileSelectionRoute
import tv.bayit.plus.feature.search.SearchRoute
import tv.bayit.plus.feature.vod.VodRoute
import tv.bayit.plus.feature.vod.detail.MovieDetailRoute
import tv.bayit.plus.feature.vod.series.SeriesDetailRoute

@Composable
fun BayitNavHost(modifier: Modifier = Modifier, startRoute: Route? = null) {
    val navController = rememberNavController()
    NavHost(navController = navController, startDestination = Route.Home, modifier = modifier) {
        composable<Route.Home> {
            HomeRoute(
                onNavigateToContent = { id, _ -> navController.navigate(Route.MovieDetail(movieId = id)) },
                onNavigateToPlayer = { id, type -> navController.navigate(Route.Player(contentId = id, contentType = type)) },
            )
        }
        composable<Route.LiveTV> {
            LiveTVRoute(onNavigateToPlayer = { id, type -> navController.navigate(Route.Player(contentId = id, contentType = type)) })
        }
        composable<Route.Vod> {
            VodRoute(onNavigateToContent = { id, type -> navController.navigateToContent(id, type) })
        }
        composable<Route.Radio> { GlassLoadingIndicator() }
        composable<Route.Podcasts> {
            PodcastsRoute(onNavigateToPodcast = { id -> navController.navigate(Route.PodcastDetail(showId = id)) })
        }
        composable<Route.Search> {
            SearchRoute(onNavigateToContent = { id, type -> navController.navigateToContent(id, type) })
        }
        composable<Route.Player> { entry ->
            val route = entry.toRoute<Route.Player>()
            PlayerRoute(contentId = route.contentId, contentType = route.contentType, onNavigateBack = { navController.popBackStack() })
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
                onNavigateToRelated = { id -> navController.navigate(Route.MovieDetail(movieId = id)) },
                onNavigateBack = { navController.popBackStack() },
            )
        }
        composable<Route.CollectionDetail> { GlassLoadingIndicator() }
        composable<Route.PodcastDetail> { GlassLoadingIndicator() }
        composable<Route.Epg> { GlassLoadingIndicator() }
        composable<Route.Login> { GlassLoadingIndicator() }
        composable<Route.Register> {
            RegisterRoute(
                onNavigateToProfileSelection = {
                    navController.navigate(Route.ProfileSelection) {
                        popUpTo(Route.Register) { inclusive = true }
                    }
                },
                onNavigateToLogin = { navController.popBackStack() },
            )
        }
        composable<Route.ForgotPassword> { GlassLoadingIndicator() }
        composable<Route.ProfileSelection> {
            ProfileSelectionRoute(
                onNavigateToHome = {
                    navController.navigate(Route.Home) {
                        popUpTo(Route.ProfileSelection) { inclusive = true }
                    }
                },
                onNavigateToAddProfile = { navController.navigate(Route.AddProfile) },
            )
        }
        composable<Route.AddProfile> { GlassLoadingIndicator() }
        composable<Route.EditProfile> { GlassLoadingIndicator() }
        composable<Route.Profile> { GlassLoadingIndicator() }
        composable<Route.Favorites> { GlassLoadingIndicator() }
        composable<Route.Playlist> { GlassLoadingIndicator() }
        composable<Route.Downloads> { GlassLoadingIndicator() }
        composable<Route.Recordings> { GlassLoadingIndicator() }
        composable<Route.Settings> { GlassLoadingIndicator() }
        composable<Route.LanguageSettings> { GlassLoadingIndicator() }
        composable<Route.NotificationSettings> { GlassLoadingIndicator() }
        composable<Route.Billing> { GlassLoadingIndicator() }
        composable<Route.Subscription> { GlassLoadingIndicator() }
        composable<Route.Security> { GlassLoadingIndicator() }
        composable<Route.ConnectedAccounts> { GlassLoadingIndicator() }
        composable<Route.Children> { GlassLoadingIndicator() }
        composable<Route.Youngsters> { GlassLoadingIndicator() }
        composable<Route.Judaism> { GlassLoadingIndicator() }
        composable<Route.Flows> { GlassLoadingIndicator() }
        composable<Route.MorningRitual> { GlassLoadingIndicator() }
        composable<Route.Culture> { GlassLoadingIndicator() }
        composable<Route.Audiobooks> { GlassLoadingIndicator() }
        composable<Route.AudiobookDetail> { GlassLoadingIndicator() }
        composable<Route.Friends> { GlassLoadingIndicator() }
        composable<Route.DirectMessages> { GlassLoadingIndicator() }
        composable<Route.Conversation> { GlassLoadingIndicator() }
        composable<Route.WatchParty> { GlassLoadingIndicator() }
        composable<Route.WatchPartyDetail> { GlassLoadingIndicator() }
        composable<Route.Chess> { GlassLoadingIndicator() }
        composable<Route.ActivityFeed> { GlassLoadingIndicator() }
        composable<Route.Trivia> { GlassLoadingIndicator() }
        composable<Route.Rewards> { GlassLoadingIndicator() }
        composable<Route.Trending> { GlassLoadingIndicator() }
        composable<Route.LlmSearch> { GlassLoadingIndicator() }
        composable<Route.Chatbot> { GlassLoadingIndicator() }
        composable<Route.VoiceOnboarding> { GlassLoadingIndicator() }
        composable<Route.OnboardingAI> { GlassLoadingIndicator() }
        composable<Route.ShabbatMode> { GlassLoadingIndicator() }
        composable<Route.JerusalemContent> { GlassLoadingIndicator() }
        composable<Route.TelAvivContent> { GlassLoadingIndicator() }
        composable<Route.FamilyControls> { GlassLoadingIndicator() }
        composable<Route.Household> { GlassLoadingIndicator() }
        composable<Route.DevicePairing> { GlassLoadingIndicator() }
        composable<Route.BetaCredits> { GlassLoadingIndicator() }
        composable<Route.SubscriptionGate> { GlassLoadingIndicator() }
        composable<Route.AvatarMode> { GlassLoadingIndicator() }
        composable<Route.PasskeyManagement> { GlassLoadingIndicator() }
        composable<Route.Widgets> { GlassLoadingIndicator() }
        composable<Route.HelpCenter> { GlassLoadingIndicator() }
        composable<Route.Support> { GlassLoadingIndicator() }
        composable<Route.MfaSetup> { GlassLoadingIndicator() }
        composable<Route.PhoneVerification> { GlassLoadingIndicator() }
        composable<Route.InteractiveSubtitles> { GlassLoadingIndicator() }
        composable<Route.Chapters> { GlassLoadingIndicator() }
        composable<Route.Glossary> { GlassLoadingIndicator() }
        composable<Route.GlossaryDetail> { GlassLoadingIndicator() }
        composable<Route.ZehAni> { GlassLoadingIndicator() }
        composable<Route.ZehAniMagicMirror> { GlassLoadingIndicator() }
        composable<Route.ZehAniV2V> { GlassLoadingIndicator() }
        composable<Route.ZehAniAvatar3D> { GlassLoadingIndicator() }
        composable<Route.ZehAniHighlights> { GlassLoadingIndicator() }
        composable<Route.ZehAniContacts> { GlassLoadingIndicator() }
        composable<Route.ZehAniFeedback> { GlassLoadingIndicator() }
        composable<Route.ZehAniAvatarSettings> { GlassLoadingIndicator() }
        composable<Route.MissionsDashboard> { GlassLoadingIndicator() }
        composable<Route.InteractiveMission> { GlassLoadingIndicator() }
        composable<Route.StarStory> { GlassLoadingIndicator() }
        composable<Route.V2VPractice> { GlassLoadingIndicator() }
        composable<Route.AvatarWardrobe> { GlassLoadingIndicator() }
        composable<Route.MeshAvatar> { GlassLoadingIndicator() }
        composable<Route.VideoSelfie> { GlassLoadingIndicator() }
        composable<Route.NewsClip> { GlassLoadingIndicator() }
        composable<Route.WidgetGallery> { GlassLoadingIndicator() }
        composable<Route.PaymentSuccess> { GlassLoadingIndicator() }
        composable<Route.PaymentCancelled> { GlassLoadingIndicator() }
        composable<Route.PaymentPending> { GlassLoadingIndicator() }
        composable<Route.Subscribe> { GlassLoadingIndicator() }
    }
}

/**
 * Routes content navigation by type to the appropriate detail screen.
 */
private fun NavController.navigateToContent(contentId: String, contentType: String) {
    when (contentType) {
        "series" -> navigate(Route.SeriesDetail(seriesId = contentId))
        "collection" -> navigate(Route.CollectionDetail(collectionId = contentId))
        "podcast" -> navigate(Route.PodcastDetail(showId = contentId))
        else -> navigate(Route.MovieDetail(movieId = contentId))
    }
}

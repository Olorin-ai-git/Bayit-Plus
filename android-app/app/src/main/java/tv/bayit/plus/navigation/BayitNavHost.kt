package tv.bayit.plus.navigation

import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import tv.bayit.plus.designsystem.component.GlassLoadingIndicator
import tv.bayit.plus.feature.home.HomeRoute

@Composable
fun BayitNavHost(
    modifier: Modifier = Modifier,
    startRoute: Route? = null,
) {
    val navController = rememberNavController()

    NavHost(
        navController = navController,
        startDestination = Route.Home,
        modifier = modifier,
    ) {
        // Tab roots
        composable<Route.Home> {
            HomeRoute(
                onNavigateToContent = { contentId, contentType ->
                    navController.navigate(Route.MovieDetail(movieId = contentId))
                },
                onNavigateToPlayer = { contentId, contentType ->
                    navController.navigate(Route.Player(contentId = contentId, contentType = contentType))
                },
            )
        }
        composable<Route.LiveTV> { GlassLoadingIndicator() }
        composable<Route.Vod> { GlassLoadingIndicator() }
        composable<Route.Radio> { GlassLoadingIndicator() }
        composable<Route.Podcasts> { GlassLoadingIndicator() }
        composable<Route.Search> { GlassLoadingIndicator() }

        // Content detail
        composable<Route.Player> { GlassLoadingIndicator() }
        composable<Route.MovieDetail> { GlassLoadingIndicator() }
        composable<Route.SeriesDetail> { GlassLoadingIndicator() }
        composable<Route.CollectionDetail> { GlassLoadingIndicator() }
        composable<Route.PodcastDetail> { GlassLoadingIndicator() }
        composable<Route.Epg> { GlassLoadingIndicator() }

        // Auth
        composable<Route.Login> { GlassLoadingIndicator() }
        composable<Route.Register> { GlassLoadingIndicator() }
        composable<Route.ForgotPassword> { GlassLoadingIndicator() }
        composable<Route.ProfileSelection> { GlassLoadingIndicator() }
        composable<Route.AddProfile> { GlassLoadingIndicator() }
        composable<Route.EditProfile> { GlassLoadingIndicator() }

        // User features
        composable<Route.Profile> { GlassLoadingIndicator() }
        composable<Route.Favorites> { GlassLoadingIndicator() }
        composable<Route.Playlist> { GlassLoadingIndicator() }
        composable<Route.Downloads> { GlassLoadingIndicator() }
        composable<Route.Recordings> { GlassLoadingIndicator() }

        // Settings
        composable<Route.Settings> { GlassLoadingIndicator() }
        composable<Route.LanguageSettings> { GlassLoadingIndicator() }
        composable<Route.NotificationSettings> { GlassLoadingIndicator() }
        composable<Route.Billing> { GlassLoadingIndicator() }
        composable<Route.Subscription> { GlassLoadingIndicator() }
        composable<Route.Security> { GlassLoadingIndicator() }
        composable<Route.ConnectedAccounts> { GlassLoadingIndicator() }

        // Content categories
        composable<Route.Children> { GlassLoadingIndicator() }
        composable<Route.Youngsters> { GlassLoadingIndicator() }
        composable<Route.Judaism> { GlassLoadingIndicator() }
        composable<Route.Flows> { GlassLoadingIndicator() }
        composable<Route.MorningRitual> { GlassLoadingIndicator() }
        composable<Route.Culture> { GlassLoadingIndicator() }
        composable<Route.Audiobooks> { GlassLoadingIndicator() }
        composable<Route.AudiobookDetail> { GlassLoadingIndicator() }

        // Social
        composable<Route.Friends> { GlassLoadingIndicator() }
        composable<Route.DirectMessages> { GlassLoadingIndicator() }
        composable<Route.Conversation> { GlassLoadingIndicator() }
        composable<Route.WatchParty> { GlassLoadingIndicator() }
        composable<Route.WatchPartyDetail> { GlassLoadingIndicator() }
        composable<Route.Chess> { GlassLoadingIndicator() }
        composable<Route.ActivityFeed> { GlassLoadingIndicator() }

        // Specialized
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

        // Zeh Ani
        composable<Route.ZehAni> { GlassLoadingIndicator() }
        composable<Route.ZehAniMagicMirror> { GlassLoadingIndicator() }
        composable<Route.ZehAniV2V> { GlassLoadingIndicator() }
        composable<Route.ZehAniAvatar3D> { GlassLoadingIndicator() }
        composable<Route.ZehAniHighlights> { GlassLoadingIndicator() }
        composable<Route.ZehAniContacts> { GlassLoadingIndicator() }
        composable<Route.ZehAniFeedback> { GlassLoadingIndicator() }
        composable<Route.ZehAniAvatarSettings> { GlassLoadingIndicator() }

        // Missions
        composable<Route.MissionsDashboard> { GlassLoadingIndicator() }
        composable<Route.InteractiveMission> { GlassLoadingIndicator() }
        composable<Route.StarStory> { GlassLoadingIndicator() }
        composable<Route.V2VPractice> { GlassLoadingIndicator() }
        composable<Route.AvatarWardrobe> { GlassLoadingIndicator() }
        composable<Route.MeshAvatar> { GlassLoadingIndicator() }
        composable<Route.VideoSelfie> { GlassLoadingIndicator() }
        composable<Route.NewsClip> { GlassLoadingIndicator() }
        composable<Route.WidgetGallery> { GlassLoadingIndicator() }

        // Payment
        composable<Route.PaymentSuccess> { GlassLoadingIndicator() }
        composable<Route.PaymentCancelled> { GlassLoadingIndicator() }
        composable<Route.PaymentPending> { GlassLoadingIndicator() }
        composable<Route.Subscribe> { GlassLoadingIndicator() }
    }
}

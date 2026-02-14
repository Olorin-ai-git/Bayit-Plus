package tv.bayit.plus.navigation

import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.navigation.NavController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.toRoute
import tv.bayit.plus.designsystem.component.GlassLoadingIndicator
import tv.bayit.plus.feature.audiobooks.AudiobooksRoute
import tv.bayit.plus.feature.audiobooks.detail.AudiobookDetailRoute
import tv.bayit.plus.feature.auth.register.RegisterRoute
import tv.bayit.plus.feature.culture.CultureRoute
import tv.bayit.plus.feature.culture.flows.FlowsRoute
import tv.bayit.plus.feature.culture.judaism.JudaismRoute
import tv.bayit.plus.feature.culture.morning.MorningRitualRoute
import tv.bayit.plus.feature.home.HomeRoute
import tv.bayit.plus.feature.kids.children.ChildrenRoute
import tv.bayit.plus.feature.kids.youngsters.YoungstersRoute
import tv.bayit.plus.feature.livetv.LiveTVRoute
import tv.bayit.plus.feature.missions.MissionsDashboardRoute
import tv.bayit.plus.feature.missions.interactive.InteractiveMissionRoute
import tv.bayit.plus.feature.missions.story.StarStoryRoute
import tv.bayit.plus.feature.player.PlayerRoute
import tv.bayit.plus.feature.podcasts.PodcastsRoute
import tv.bayit.plus.feature.podcasts.detail.PodcastDetailRoute
import tv.bayit.plus.feature.profile.selection.ProfileSelectionRoute
import tv.bayit.plus.feature.radio.RadioRoute
import tv.bayit.plus.feature.rewards.RewardsRoute
import tv.bayit.plus.feature.search.SearchRoute
import tv.bayit.plus.feature.settings.SettingsRoute
import tv.bayit.plus.feature.settings.accounts.ConnectedAccountsRoute
import tv.bayit.plus.feature.settings.billing.BillingRoute
import tv.bayit.plus.feature.settings.family.FamilyControlsRoute
import tv.bayit.plus.feature.settings.help.HelpRoute
import tv.bayit.plus.feature.settings.household.HouseholdRoute
import tv.bayit.plus.feature.settings.language.LanguageSettingsRoute
import tv.bayit.plus.feature.settings.notifications.NotificationSettingsRoute
import tv.bayit.plus.feature.settings.profile.ProfileRoute
import tv.bayit.plus.feature.settings.security.SecurityRoute
import tv.bayit.plus.feature.settings.subscription.SubscriptionRoute
import tv.bayit.plus.feature.social.chess.ChessRoute
import tv.bayit.plus.feature.social.conversation.ConversationRoute
import tv.bayit.plus.feature.social.feed.ActivityFeedRoute
import tv.bayit.plus.feature.social.friends.FriendsRoute
import tv.bayit.plus.feature.social.messages.DirectMessagesRoute
import tv.bayit.plus.feature.social.watchparty.WatchPartyRoute
import tv.bayit.plus.feature.social.watchparty.active.ActivePartyRoute
import tv.bayit.plus.feature.trivia.TriviaRoute
import tv.bayit.plus.feature.vod.VodRoute
import tv.bayit.plus.feature.vod.collection.CollectionDetailRoute
import tv.bayit.plus.feature.vod.detail.MovieDetailRoute
import tv.bayit.plus.feature.vod.recordings.RecordingsRoute
import tv.bayit.plus.feature.vod.series.SeriesDetailRoute
import tv.bayit.plus.feature.vod.trending.TrendingRoute

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
        composable<Route.Radio> {
            RadioRoute(onNavigateToPlayer = { id, type -> navController.navigate(Route.Player(contentId = id, contentType = type)) })
        }
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
        composable<Route.CollectionDetail> {
            CollectionDetailRoute(
                onNavigateToMovie = { id -> navController.navigate(Route.MovieDetail(movieId = id)) },
                onNavigateBack = { navController.popBackStack() },
            )
        }
        composable<Route.PodcastDetail> {
            PodcastDetailRoute(
                onNavigateToPlayer = { id, type -> navController.navigate(Route.Player(contentId = id, contentType = type)) },
                onNavigateBack = { navController.popBackStack() },
            )
        }
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
        composable<Route.Profile> {
            ProfileRoute(onNavigateBack = { navController.popBackStack() })
        }
        composable<Route.Favorites> { GlassLoadingIndicator() }
        composable<Route.Playlist> { GlassLoadingIndicator() }
        composable<Route.Downloads> { GlassLoadingIndicator() }
        composable<Route.Recordings> {
            RecordingsRoute(onNavigateToPlayer = { id, type -> navController.navigate(Route.Player(contentId = id, contentType = type)) })
        }
        composable<Route.Settings> {
            SettingsRoute(
                onNavigateBack = { navController.popBackStack() },
                onNavigateToMenuItem = { route -> navController.navigateToSettingsSubScreen(route) },
                onLoggedOut = {
                    navController.navigate(Route.Login) {
                        popUpTo(Route.Home) { inclusive = true }
                    }
                },
            )
        }
        composable<Route.LanguageSettings> {
            LanguageSettingsRoute(onNavigateBack = { navController.popBackStack() })
        }
        composable<Route.NotificationSettings> {
            NotificationSettingsRoute(onNavigateBack = { navController.popBackStack() })
        }
        composable<Route.Billing> {
            BillingRoute(onNavigateBack = { navController.popBackStack() })
        }
        composable<Route.Subscription> {
            SubscriptionRoute(
                onNavigateBack = { navController.popBackStack() },
                onNavigateToUpgrade = { navController.navigate(Route.Subscribe) },
            )
        }
        composable<Route.Security> {
            SecurityRoute(onNavigateBack = { navController.popBackStack() })
        }
        composable<Route.ConnectedAccounts> {
            ConnectedAccountsRoute(onNavigateBack = { navController.popBackStack() })
        }
        composable<Route.Children> {
            ChildrenRoute(onNavigateToContent = { id, type -> navController.navigateToContent(id, type) })
        }
        composable<Route.Youngsters> {
            YoungstersRoute(onNavigateToContent = { id, type -> navController.navigateToContent(id, type) })
        }
        composable<Route.Judaism> {
            JudaismRoute(onNavigateToContent = { id, type -> navController.navigateToContent(id, type) })
        }
        composable<Route.Flows> {
            FlowsRoute(onNavigateToPlayer = { id, type -> navController.navigate(Route.Player(contentId = id, contentType = type)) })
        }
        composable<Route.MorningRitual> {
            MorningRitualRoute()
        }
        composable<Route.Culture> {
            CultureRoute(onNavigateToContent = { id, type -> navController.navigateToContent(id, type) })
        }
        composable<Route.Audiobooks> {
            AudiobooksRoute(onNavigateToAudiobook = { id -> navController.navigate(Route.AudiobookDetail(audiobookId = id)) })
        }
        composable<Route.AudiobookDetail> {
            AudiobookDetailRoute(
                onNavigateToPlayer = { id, type -> navController.navigate(Route.Player(contentId = id, contentType = type)) },
                onNavigateBack = { navController.popBackStack() },
            )
        }
        composable<Route.Friends> {
            FriendsRoute(onNavigateBack = { navController.popBackStack() })
        }
        composable<Route.DirectMessages> {
            DirectMessagesRoute(
                onNavigateToConversation = { friendId ->
                    navController.navigate(Route.Conversation(friendId = friendId))
                },
                onNavigateBack = { navController.popBackStack() },
            )
        }
        composable<Route.Conversation> {
            ConversationRoute(onNavigateBack = { navController.popBackStack() })
        }
        composable<Route.WatchParty> {
            WatchPartyRoute(
                onNavigateToActiveParty = { partyId ->
                    navController.navigate(Route.WatchPartyDetail(partyId = partyId))
                },
                onNavigateBack = { navController.popBackStack() },
            )
        }
        composable<Route.WatchPartyDetail> {
            ActivePartyRoute(onNavigateBack = { navController.popBackStack() })
        }
        composable<Route.Chess> {
            ChessRoute(onNavigateBack = { navController.popBackStack() })
        }
        composable<Route.ActivityFeed> {
            ActivityFeedRoute(onNavigateBack = { navController.popBackStack() })
        }
        composable<Route.Trivia> {
            TriviaRoute(onNavigateBack = { navController.popBackStack() })
        }
        composable<Route.Rewards> {
            RewardsRoute(onNavigateBack = { navController.popBackStack() })
        }
        composable<Route.Trending> {
            TrendingRoute(onNavigateToContent = { id, type -> navController.navigateToContent(id, type) })
        }
        composable<Route.LlmSearch> { GlassLoadingIndicator() }
        composable<Route.Chatbot> { GlassLoadingIndicator() }
        composable<Route.VoiceOnboarding> { GlassLoadingIndicator() }
        composable<Route.OnboardingAI> { GlassLoadingIndicator() }
        composable<Route.ShabbatMode> { GlassLoadingIndicator() }
        composable<Route.JerusalemContent> { GlassLoadingIndicator() }
        composable<Route.TelAvivContent> { GlassLoadingIndicator() }
        composable<Route.FamilyControls> {
            FamilyControlsRoute(onNavigateBack = { navController.popBackStack() })
        }
        composable<Route.Household> {
            HouseholdRoute(onNavigateBack = { navController.popBackStack() })
        }
        composable<Route.DevicePairing> { GlassLoadingIndicator() }
        composable<Route.BetaCredits> { GlassLoadingIndicator() }
        composable<Route.SubscriptionGate> { GlassLoadingIndicator() }
        composable<Route.AvatarMode> { GlassLoadingIndicator() }
        composable<Route.PasskeyManagement> { GlassLoadingIndicator() }
        composable<Route.Widgets> { GlassLoadingIndicator() }
        composable<Route.HelpCenter> {
            HelpRoute(
                onNavigateBack = { navController.popBackStack() },
                onNavigateToSupport = { navController.navigate(Route.Support) },
            )
        }
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
        composable<Route.MissionsDashboard> {
            MissionsDashboardRoute(
                onNavigateToInteractiveMission = { missionId ->
                    navController.navigate(Route.InteractiveMission(missionId = missionId))
                },
                onNavigateToStarStory = { navController.navigate(Route.StarStory) },
            )
        }
        composable<Route.InteractiveMission> {
            InteractiveMissionRoute(onNavigateBack = { navController.popBackStack() })
        }
        composable<Route.StarStory> {
            StarStoryRoute(onNavigateBack = { navController.popBackStack() })
        }
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

/**
 * Maps settings menu item route strings to their corresponding navigation routes.
 */
private fun NavController.navigateToSettingsSubScreen(route: String) {
    when (route) {
        "profile" -> navigate(Route.Profile)
        "language" -> navigate(Route.LanguageSettings)
        "notifications" -> navigate(Route.NotificationSettings)
        "subscription" -> navigate(Route.Subscription)
        "billing" -> navigate(Route.Billing)
        "security" -> navigate(Route.Security)
        "accounts" -> navigate(Route.ConnectedAccounts)
        "family" -> navigate(Route.FamilyControls)
        "household" -> navigate(Route.Household)
        "help" -> navigate(Route.HelpCenter)
    }
}

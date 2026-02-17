package tv.bayit.plus.navigation

import android.app.Activity
import android.content.Intent
import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.runtime.Composable
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.navigation.NavController
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.toRoute
import kotlinx.coroutines.launch
import tv.bayit.plus.BuildConfig
import tv.bayit.plus.core.auth.GoogleSignInHelper
import tv.bayit.plus.core.common.result.BayitError
import tv.bayit.plus.core.common.result.BayitResult
import tv.bayit.plus.designsystem.component.GlassLoadingIndicator
import tv.bayit.plus.feature.audiobooks.AudiobooksRoute
import tv.bayit.plus.feature.audiobooks.detail.AudiobookDetailRoute
import tv.bayit.plus.feature.auth.login.LoginRoute
import tv.bayit.plus.feature.auth.payment.PaymentCancelledRoute
import tv.bayit.plus.feature.auth.payment.PaymentPendingRoute
import tv.bayit.plus.feature.auth.payment.PaymentSuccessRoute
import tv.bayit.plus.feature.auth.forgot.ForgotPasswordRoute
import tv.bayit.plus.feature.auth.register.RegisterRoute
import tv.bayit.plus.feature.auth.splash.SplashRoute
import tv.bayit.plus.feature.auth.subscription.SubscribeRoute
import tv.bayit.plus.feature.auth.subscription.SubscriptionGateRoute
import tv.bayit.plus.feature.culture.CultureRoute
import tv.bayit.plus.feature.culture.jerusalem.JerusalemContentRoute
import tv.bayit.plus.feature.culture.shabbat.ShabbatModeRoute
import tv.bayit.plus.feature.culture.telaviv.TelAvivContentRoute
import tv.bayit.plus.feature.culture.flows.FlowsRoute
import tv.bayit.plus.feature.culture.glossary.GlossaryRoute
import tv.bayit.plus.feature.culture.glossary.detail.GlossaryDetailRoute
import tv.bayit.plus.feature.culture.judaism.JudaismRoute
import tv.bayit.plus.feature.culture.morning.MorningRitualRoute
import tv.bayit.plus.feature.home.HomeRoute
import tv.bayit.plus.feature.kids.children.ChildrenRoute
import tv.bayit.plus.feature.kids.youngsters.YoungstersRoute
import tv.bayit.plus.feature.livetv.LiveTVRoute
import tv.bayit.plus.feature.livetv.epg.EPGRoute
import tv.bayit.plus.feature.missions.MissionsDashboardRoute
import tv.bayit.plus.feature.missions.interactive.InteractiveMissionRoute
import tv.bayit.plus.feature.missions.story.StarStoryRoute
import tv.bayit.plus.feature.player.PlayerRoute
import tv.bayit.plus.feature.player.chapters.ChaptersRoute
import tv.bayit.plus.feature.player.subtitles.InteractiveSubtitlesRoute
import tv.bayit.plus.feature.podcasts.PodcastsRoute
import tv.bayit.plus.feature.podcasts.detail.PodcastDetailRoute
import tv.bayit.plus.feature.downloads.DownloadsRoute
import tv.bayit.plus.feature.profile.add.AddProfileRoute
import tv.bayit.plus.feature.profile.edit.EditProfileRoute
import tv.bayit.plus.feature.profile.selection.ProfileSelectionRoute
import tv.bayit.plus.feature.radio.RadioRoute
import tv.bayit.plus.feature.rewards.RewardsRoute
import tv.bayit.plus.feature.rewards.beta.BetaCreditsRoute
import tv.bayit.plus.feature.search.SearchRoute
import tv.bayit.plus.feature.search.llm.LLMSearchRoute
import tv.bayit.plus.feature.settings.SettingsRoute
import tv.bayit.plus.feature.settings.support.SupportRoute
import tv.bayit.plus.feature.settings.accounts.ConnectedAccountsRoute
import tv.bayit.plus.feature.settings.billing.BillingRoute
import tv.bayit.plus.feature.settings.family.FamilyControlsRoute
import tv.bayit.plus.feature.settings.help.HelpRoute
import tv.bayit.plus.feature.settings.household.HouseholdRoute
import tv.bayit.plus.feature.settings.language.LanguageSettingsRoute
import tv.bayit.plus.feature.settings.notifications.NotificationSettingsRoute
import tv.bayit.plus.feature.settings.profile.ProfileRoute
import tv.bayit.plus.feature.settings.security.SecurityRoute
import tv.bayit.plus.feature.settings.security.devices.DevicePairingRoute
import tv.bayit.plus.feature.settings.security.mfa.MFASetupRoute
import tv.bayit.plus.feature.settings.security.passkey.PasskeyManagementRoute
import tv.bayit.plus.feature.settings.security.phone.PhoneVerificationRoute
import tv.bayit.plus.feature.settings.subscription.SubscriptionRoute
import tv.bayit.plus.feature.social.chess.ChessRoute
import tv.bayit.plus.feature.social.grandparent.NewsClipRoute
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
import tv.bayit.plus.feature.vod.favorites.FavoritesRoute
import tv.bayit.plus.feature.vod.playlist.PlaylistRoute
import tv.bayit.plus.feature.vod.trending.TrendingRoute
import tv.bayit.plus.feature.voice.chatbot.ChatbotRoute
import tv.bayit.plus.feature.voice.onboarding.AIOnboardingRoute
import tv.bayit.plus.feature.voice.onboarding.VoiceOnboardingRoute
import tv.bayit.plus.feature.widgets.WidgetGalleryRoute
import tv.bayit.plus.feature.zehani.ZehAniDashboardRoute
import tv.bayit.plus.feature.zehani.mesh.MeshAvatarRoute
import tv.bayit.plus.feature.zehani.mode.AvatarModeRoute
import tv.bayit.plus.feature.zehani.selfie.VideoSelfieRoute
import tv.bayit.plus.feature.zehani.wardrobe.AvatarWardrobeRoute
import tv.bayit.plus.feature.zehani.avatar.Avatar3DRoute
import tv.bayit.plus.feature.zehani.contacts.ContactsRoute
import tv.bayit.plus.feature.zehani.feedback.FeedbackRoute
import tv.bayit.plus.feature.zehani.highlights.HighlightsRoute
import tv.bayit.plus.feature.zehani.mirror.MagicMirrorRoute
import tv.bayit.plus.feature.zehani.consent.BiometricConsentRoute
import tv.bayit.plus.feature.zehani.settings.AvatarSettingsRoute
import tv.bayit.plus.feature.zehani.v2v.V2VPracticeRoute

@Composable
fun BayitNavHost(
    navController: NavHostController,
    googleSignInHelper: GoogleSignInHelper,
    modifier: Modifier = Modifier,
    startRoute: Route? = null
) {
    val context = LocalContext.current
    val coroutineScope = rememberCoroutineScope()
    val pendingGoogleCallback = remember { mutableStateOf<((String) -> Unit)?>(null) }

    val legacyGoogleSignInLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.StartActivityForResult()
    ) { activityResult ->
        val callback = pendingGoogleCallback.value ?: return@rememberLauncherForActivityResult
        pendingGoogleCallback.value = null
        when (val result = googleSignInHelper.handleLegacySignInResult(activityResult.data)) {
            is BayitResult.Success -> callback(result.data)
            is BayitResult.Failure -> callback("")
        }
    }

    NavHost(navController = navController, startDestination = startRoute ?: Route.Splash, modifier = modifier) {
        composable<Route.Splash> {
            SplashRoute(
                onFinished = {
                    navController.navigate(Route.Home) {
                        popUpTo(Route.Splash) { inclusive = true }
                    }
                },
            )
        }
        composable<Route.Home> {
            HomeRoute(
                onNavigateToContent = { id, type -> navController.navigateToContent(id, type) },
                onNavigateToPlayer = { id, type -> navController.navigate(Route.Player(contentId = id, contentType = type)) },
                onNavigateToChannel = { channelId -> navController.navigate(Route.Player(contentId = channelId, contentType = "live")) },
                onNavigateToRadio = { radioId -> navController.navigate(Route.Player(contentId = radioId, contentType = "radio")) },
                onNavigateToYoungsters = { navController.navigate(Route.Youngsters) },
                onNavigateToJerusalem = { navController.navigate(Route.JerusalemContent) },
                onNavigateToTelAviv = { navController.navigate(Route.TelAvivContent) },
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
        composable<Route.Epg> {
            EPGRoute(
                onNavigateToChannel = { channelId -> navController.navigate(Route.Player(contentId = channelId, contentType = "live")) },
                onNavigateBack = { navController.popBackStack() },
            )
        }
        composable<Route.Login> {
            LoginRoute(
                onNavigateToHome = {
                    navController.navigate(Route.Home) {
                        popUpTo(Route.Login) { inclusive = true }
                    }
                },
                onNavigateToRegister = { navController.navigate(Route.Register) },
                onNavigateToForgotPassword = { navController.navigate(Route.ForgotPassword) },
                onRequestGoogleSignIn = { onTokenReceived ->
                    coroutineScope.launch {
                        val activity = context as? Activity ?: return@launch
                        val clientId = BuildConfig.GOOGLE_CLIENT_ID

                        when (val result = googleSignInHelper.signIn(activity, clientId)) {
                            is BayitResult.Success -> onTokenReceived(result.data)
                            is BayitResult.Failure -> {
                                val error = result.error
                                if (error is BayitError.Cancelled || error is BayitError.Configuration) {
                                    onTokenReceived("")
                                } else {
                                    pendingGoogleCallback.value = onTokenReceived
                                    legacyGoogleSignInLauncher.launch(
                                        googleSignInHelper.createLegacySignInIntent(activity, clientId)
                                    )
                                }
                            }
                        }
                    }
                },
            )
        }
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
        composable<Route.ForgotPassword> {
            ForgotPasswordRoute(
                onNavigateBack = { navController.popBackStack() },
                onResetSent = { navController.popBackStack() },
            )
        }
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
        composable<Route.AddProfile> {
            AddProfileRoute(
                onNavigateBack = { navController.popBackStack() },
                onProfileCreated = { navController.popBackStack() },
            )
        }
        composable<Route.EditProfile> {
            EditProfileRoute(
                onNavigateBack = { navController.popBackStack() },
                onProfileSaved = { navController.popBackStack() },
            )
        }
        composable<Route.Profile> {
            ProfileRoute(onNavigateBack = { navController.popBackStack() })
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
        composable<Route.Downloads> {
            DownloadsRoute(
                onNavigateBack = { navController.popBackStack() },
            )
        }
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
        composable<Route.LlmSearch> {
            LLMSearchRoute(
                onNavigateToContent = { id, type -> navController.navigateToContent(id, type) },
                onNavigateBack = { navController.popBackStack() },
            )
        }
        composable<Route.Chatbot> {
            ChatbotRoute(onNavigateBack = { navController.popBackStack() })
        }
        composable<Route.VoiceOnboarding> {
            VoiceOnboardingRoute(
                onComplete = { navController.popBackStack() },
                onNavigateBack = { navController.popBackStack() },
            )
        }
        composable<Route.OnboardingAI> {
            AIOnboardingRoute(
                onComplete = { navController.popBackStack() },
                onNavigateBack = { navController.popBackStack() },
            )
        }
        composable<Route.ShabbatMode> {
            ShabbatModeRoute(onNavigateBack = { navController.popBackStack() })
        }
        composable<Route.JerusalemContent> {
            JerusalemContentRoute(
                onNavigateToContent = { id, type -> navController.navigateToContent(id, type) },
                onNavigateBack = { navController.popBackStack() },
            )
        }
        composable<Route.TelAvivContent> {
            TelAvivContentRoute(
                onNavigateToContent = { id, type -> navController.navigateToContent(id, type) },
                onNavigateBack = { navController.popBackStack() },
            )
        }
        composable<Route.FamilyControls> {
            FamilyControlsRoute(onNavigateBack = { navController.popBackStack() })
        }
        composable<Route.Household> {
            HouseholdRoute(onNavigateBack = { navController.popBackStack() })
        }
        composable<Route.DevicePairing> {
            DevicePairingRoute(onNavigateBack = { navController.popBackStack() })
        }
        composable<Route.BetaCredits> {
            BetaCreditsRoute(onNavigateBack = { navController.popBackStack() })
        }
        composable<Route.SubscriptionGate> {
            SubscriptionGateRoute(
                onNavigateToSubscribe = { navController.navigate(Route.Subscribe) },
                onNavigateBack = { navController.popBackStack() },
            )
        }
        composable<Route.AvatarMode> {
            AvatarModeRoute(onNavigateBack = { navController.popBackStack() })
        }
        composable<Route.PasskeyManagement> {
            PasskeyManagementRoute(onNavigateBack = { navController.popBackStack() })
        }
        composable<Route.Widgets> {
            WidgetGalleryRoute(onNavigateBack = { navController.popBackStack() })
        }
        composable<Route.HelpCenter> {
            HelpRoute(
                onNavigateBack = { navController.popBackStack() },
                onNavigateToSupport = { navController.navigate(Route.Support) },
            )
        }
        composable<Route.Support> {
            SupportRoute(onNavigateBack = { navController.popBackStack() })
        }
        composable<Route.MfaSetup> {
            MFASetupRoute(
                onComplete = { navController.popBackStack() },
                onNavigateBack = { navController.popBackStack() },
            )
        }
        composable<Route.PhoneVerification> {
            PhoneVerificationRoute(
                onComplete = { navController.popBackStack() },
                onNavigateBack = { navController.popBackStack() },
            )
        }
        composable<Route.InteractiveSubtitles> {
            InteractiveSubtitlesRoute(onNavigateBack = { navController.popBackStack() })
        }
        composable<Route.Chapters> {
            ChaptersRoute(onNavigateBack = { navController.popBackStack() })
        }
        composable<Route.Glossary> {
            GlossaryRoute(
                onNavigateToTerm = { termId -> navController.navigate(Route.GlossaryDetail(termId = termId)) },
                onNavigateBack = { navController.popBackStack() },
            )
        }
        composable<Route.GlossaryDetail> {
            GlossaryDetailRoute(onNavigateBack = { navController.popBackStack() })
        }
        composable<Route.ZehAni> {
            ZehAniDashboardRoute(
                onNavigateToMagicMirror = { navController.navigate(Route.ZehAniMagicMirror(profileId = "current")) },
                onNavigateToV2V = { navController.navigate(Route.ZehAniV2V(avatarId = "default", profileId = "current")) },
                onNavigateToAvatar3D = { navController.navigate(Route.ZehAniAvatar3D(avatarId = "default")) },
                onNavigateToHighlights = { navController.navigate(Route.ZehAniHighlights(profileId = "current")) },
                onNavigateToContacts = { navController.navigate(Route.ZehAniContacts(profileId = "current")) },
                onNavigateToFeedback = { navController.navigate(Route.ZehAniFeedback(profileId = "current")) },
                onNavigateToConsent = { navController.navigate(Route.ZehAniConsent) },
                onNavigateBack = { navController.popBackStack() },
            )
        }
        composable<Route.ZehAniMagicMirror> {
            MagicMirrorRoute(onNavigateBack = { navController.popBackStack() })
        }
        composable<Route.ZehAniV2V> {
            V2VPracticeRoute(onNavigateBack = { navController.popBackStack() })
        }
        composable<Route.ZehAniAvatar3D> {
            Avatar3DRoute(onNavigateBack = { navController.popBackStack() })
        }
        composable<Route.ZehAniHighlights> {
            HighlightsRoute(onNavigateBack = { navController.popBackStack() })
        }
        composable<Route.ZehAniContacts> {
            ContactsRoute(onNavigateBack = { navController.popBackStack() })
        }
        composable<Route.ZehAniFeedback> {
            FeedbackRoute(onNavigateBack = { navController.popBackStack() })
        }
        composable<Route.ZehAniAvatarSettings> {
            AvatarSettingsRoute(onNavigateBack = { navController.popBackStack() })
        }
        composable<Route.ZehAniConsent> {
            BiometricConsentRoute(onNavigateBack = { navController.popBackStack() })
        }
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
        composable<Route.V2VPractice> {
            V2VPracticeRoute(onNavigateBack = { navController.popBackStack() })
        }
        composable<Route.AvatarWardrobe> {
            AvatarWardrobeRoute(onNavigateBack = { navController.popBackStack() })
        }
        composable<Route.MeshAvatar> {
            MeshAvatarRoute(onNavigateBack = { navController.popBackStack() })
        }
        composable<Route.VideoSelfie> {
            VideoSelfieRoute(onNavigateBack = { navController.popBackStack() })
        }
        composable<Route.NewsClip> {
            NewsClipRoute(
                onNavigateToPlayer = { id, type -> navController.navigate(Route.Player(contentId = id, contentType = type)) },
                onNavigateBack = { navController.popBackStack() },
            )
        }
        composable<Route.WidgetGallery> {
            WidgetGalleryRoute(onNavigateBack = { navController.popBackStack() })
        }
        composable<Route.PaymentSuccess> {
            PaymentSuccessRoute(onNavigateToHome = {
                navController.navigate(Route.Home) {
                    popUpTo(Route.PaymentSuccess) { inclusive = true }
                }
            })
        }
        composable<Route.PaymentCancelled> {
            PaymentCancelledRoute(
                onNavigateToSubscribe = { navController.navigate(Route.Subscribe) },
                onNavigateBack = { navController.popBackStack() },
            )
        }
        composable<Route.PaymentPending> {
            PaymentPendingRoute(onNavigateToHome = {
                navController.navigate(Route.Home) {
                    popUpTo(Route.PaymentPending) { inclusive = true }
                }
            })
        }
        composable<Route.Subscribe> {
            val context = LocalContext.current
            SubscribeRoute(
                onNavigateToCheckout = { checkoutUrl ->
                    // Launch Stripe checkout in browser
                    val intent = Intent(Intent.ACTION_VIEW, Uri.parse(checkoutUrl))
                    context.startActivity(intent)
                },
                onNavigateBack = { navController.popBackStack() },
            )
        }
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
        "passkeys" -> navigate(Route.PasskeyManagement)
        "mfa" -> navigate(Route.MfaSetup)
        "phone" -> navigate(Route.PhoneVerification)
        "devices" -> navigate(Route.DevicePairing)
    }
}

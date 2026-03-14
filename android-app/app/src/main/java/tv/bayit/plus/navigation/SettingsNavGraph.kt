package tv.bayit.plus.navigation

import androidx.navigation.NavController
import androidx.navigation.NavGraphBuilder
import androidx.navigation.compose.composable
import tv.bayit.plus.feature.downloads.DownloadsRoute
import tv.bayit.plus.feature.profile.edit.EditProfileRoute
import tv.bayit.plus.feature.rewards.RewardsRoute
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
import tv.bayit.plus.feature.settings.accessibility.AccessibilitySettingsRoute
import tv.bayit.plus.feature.settings.ai.AIFeaturesRoute
import tv.bayit.plus.feature.settings.audio.AudioSettingsRoute
import tv.bayit.plus.feature.settings.playback.PlaybackSettingsRoute
import tv.bayit.plus.feature.settings.subtitles.SubtitleSettingsRoute
import tv.bayit.plus.feature.settings.subscription.SubscriptionRoute
import tv.bayit.plus.feature.byoc.AddSourceRoute
import tv.bayit.plus.feature.byoc.BYOCSettingsRoute
import tv.bayit.plus.feature.byoc.PlexAuthRoute
import tv.bayit.plus.feature.byoc.YouTubeAuthRoute
import tv.bayit.plus.feature.settings.downloads.DownloadSettingsRoute
import tv.bayit.plus.feature.widgets.WidgetGalleryRoute

fun NavGraphBuilder.settingsNavGraph(navController: NavController) {
    composable<Route.Profile> {
        ProfileRoute(
            onNavigateBack = { navController.popBackStack() },
            onSignOut = {
                navController.navigate(Route.Login) {
                    popUpTo(0) { inclusive = true }
                }
            },
        )
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
            onReplayTour = { navController.navigate(Route.OnboardingIntro) },
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
    composable<Route.SubtitleSettings> {
        SubtitleSettingsRoute(onNavigateBack = { navController.popBackStack() })
    }
    composable<Route.AudioSettings> {
        AudioSettingsRoute(onNavigateBack = { navController.popBackStack() })
    }
    composable<Route.AIFeatures> {
        AIFeaturesRoute(onNavigateBack = { navController.popBackStack() })
    }
    composable<Route.AccessibilitySettings> {
        AccessibilitySettingsRoute(onNavigateBack = { navController.popBackStack() })
    }
    composable<Route.PlaybackSettings> {
        PlaybackSettingsRoute(onNavigateBack = { navController.popBackStack() })
    }
    composable<Route.ConnectedAccounts> {
        ConnectedAccountsRoute(onNavigateBack = { navController.popBackStack() })
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
    composable<Route.PasskeyManagement> {
        PasskeyManagementRoute(onNavigateBack = { navController.popBackStack() })
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
    composable<Route.HelpCenter> {
        HelpRoute(
            onNavigateBack = { navController.popBackStack() },
            onNavigateToSupport = { navController.navigate(Route.Support) },
        )
    }
    composable<Route.Support> {
        SupportRoute(onNavigateBack = { navController.popBackStack() })
    }
    composable<Route.Downloads> {
        DownloadsRoute(
            onNavigateBack = { navController.popBackStack() },
            onNavigateToPlayer = { id, type -> navController.navigate(Route.Player(contentId = id, contentType = type)) },
            onNavigateToVod = { navController.navigate(Route.Vod) },
        )
    }
    composable<Route.DownloadSettings> {
        DownloadSettingsRoute(onNavigateBack = { navController.popBackStack() })
    }
    composable<Route.Rewards> {
        RewardsRoute(onNavigateBack = { navController.popBackStack() })
    }
    composable<Route.Widgets> {
        WidgetGalleryRoute(onNavigateBack = { navController.popBackStack() })
    }
    composable<Route.WidgetGallery> {
        WidgetGalleryRoute(onNavigateBack = { navController.popBackStack() })
    }
    composable<Route.BYOCSettings> {
        BYOCSettingsRoute(
            onNavigateBack = { navController.popBackStack() },
            onAddPlex = { navController.navigate(Route.PlexAuth) },
            onAddYouTube = { navController.navigate(Route.YouTubeAuth) },
            onAddSource = { navController.navigate(Route.AddSource) },
        )
    }
    composable<Route.PlexAuth> {
        PlexAuthRoute(
            onNavigateBack = { navController.popBackStack() },
            onSuccess = { navController.popBackStack() },
        )
    }
    composable<Route.YouTubeAuth> {
        YouTubeAuthRoute(
            onNavigateBack = { navController.popBackStack() },
            onSuccess = { navController.popBackStack() },
        )
    }
    composable<Route.AddSource> {
        AddSourceRoute(
            onNavigateBack = { navController.popBackStack() },
            onSuccess = { navController.popBackStack() },
        )
    }
}

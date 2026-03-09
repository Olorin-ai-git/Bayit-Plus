package tv.bayit.plus.navigation

import android.content.Intent
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.runtime.Composable
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Modifier
import androidx.navigation.NavController
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import tv.bayit.plus.core.auth.BiometricAuthService
import tv.bayit.plus.core.auth.GoogleSignInHelper
import tv.bayit.plus.core.common.result.BayitResult

@Composable
fun BayitNavHost(
    navController: NavHostController,
    googleSignInHelper: GoogleSignInHelper,
    biometricAuthService: BiometricAuthService,
    modifier: Modifier = Modifier,
    startRoute: Route? = null,
) {
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

    NavHost(
        navController = navController,
        startDestination = startRoute ?: Route.Splash,
        modifier = modifier,
    ) {
        authNavGraph(
            navController = navController,
            googleSignInHelper = googleSignInHelper,
            biometricAuthService = biometricAuthService,
            pendingGoogleCallback = pendingGoogleCallback,
            legacyGoogleSignInLauncher = legacyGoogleSignInLauncher,
            coroutineScope = coroutineScope,
        )
        contentNavGraph(navController)
        socialNavGraph(navController)
        settingsNavGraph(navController)
        zehAniNavGraph(navController)
        cultureVoiceNavGraph(navController)
    }
}

/** Routes content navigation by type to the appropriate detail screen. */
internal fun NavController.navigateToContent(contentId: String, contentType: String) {
    when (contentType) {
        "series" -> navigate(Route.SeriesDetail(seriesId = contentId))
        "collection" -> navigate(Route.CollectionDetail(collectionId = contentId))
        "podcast" -> navigate(Route.PodcastDetail(showId = contentId))
        "audiobook" -> navigate(Route.AudiobookDetail(audiobookId = contentId))
        else -> navigate(Route.MovieDetail(movieId = contentId))
    }
}

/** Routes settings menu items to their corresponding navigation destinations. */
internal fun NavController.navigateToSettingsSubScreen(item: String) {
    val route: Route? = when (item) {
        SettingsMenuItem.PROFILE -> Route.Profile
        SettingsMenuItem.LANGUAGE -> Route.LanguageSettings
        SettingsMenuItem.NOTIFICATIONS -> Route.NotificationSettings
        SettingsMenuItem.SUBSCRIPTION -> Route.Subscription
        SettingsMenuItem.BILLING -> Route.Billing
        SettingsMenuItem.SECURITY -> Route.Security
        SettingsMenuItem.ACCOUNTS -> Route.ConnectedAccounts
        SettingsMenuItem.FAMILY -> Route.FamilyControls
        SettingsMenuItem.HOUSEHOLD -> Route.Household
        SettingsMenuItem.HELP -> Route.HelpCenter
        SettingsMenuItem.SUBTITLES -> Route.SubtitleSettings
        SettingsMenuItem.AUDIO -> Route.AudioSettings
        SettingsMenuItem.AI_FEATURES -> Route.AIFeatures
        SettingsMenuItem.ACCESSIBILITY -> Route.AccessibilitySettings
        SettingsMenuItem.PLAYBACK -> Route.PlaybackSettings
        SettingsMenuItem.PASSKEYS -> Route.PasskeyManagement
        SettingsMenuItem.MFA -> Route.MfaSetup
        SettingsMenuItem.PHONE -> Route.PhoneVerification
        SettingsMenuItem.DEVICES -> Route.DevicePairing
        SettingsMenuItem.VOICE -> Route.VoiceSettings
        SettingsMenuItem.BYOC -> Route.BYOCSettings
        SettingsMenuItem.REPLAY_TOUR -> Route.FeatureTour
        else -> null
    }
    route?.let { navigate(it) }
}

/** Keys for settings sub-screen navigation; match the values produced by SettingsRoute. */
object SettingsMenuItem {
    const val PROFILE = "profile"
    const val LANGUAGE = "language"
    const val NOTIFICATIONS = "notifications"
    const val SUBSCRIPTION = "subscription"
    const val BILLING = "billing"
    const val SECURITY = "security"
    const val ACCOUNTS = "accounts"
    const val FAMILY = "family"
    const val HOUSEHOLD = "household"
    const val HELP = "help"
    const val SUBTITLES = "subtitles"
    const val AUDIO = "audio"
    const val AI_FEATURES = "ai_features"
    const val ACCESSIBILITY = "accessibility"
    const val PLAYBACK = "playback"
    const val PASSKEYS = "passkeys"
    const val MFA = "mfa"
    const val PHONE = "phone"
    const val DEVICES = "devices"
    const val VOICE = "voice"
    const val BYOC = "byoc"
    const val REPLAY_TOUR = "replay_tour"
}

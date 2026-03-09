package tv.bayit.plus

import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.compose.rememberNavController
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.flow.MutableStateFlow
import tv.bayit.plus.core.auth.AuthState
import tv.bayit.plus.core.auth.OlorinAuthService
import tv.bayit.plus.core.common.CdnBaseUrl
import tv.bayit.plus.core.common.i18n.BayitStringProvider
import tv.bayit.plus.core.network.SessionEventBus
import tv.bayit.plus.designsystem.i18n.ProvideBayitStrings
import tv.bayit.plus.designsystem.theme.BayitTheme
import tv.bayit.plus.designsystem.theme.DesignTokens
import tv.bayit.plus.feature.tv.watchnext.WatchNextManager
import tv.bayit.plus.feature.tv.watchnext.WatchNextSyncWorker
import tv.bayit.plus.navigation.Route
import tv.bayit.plus.navigation.TVNavHost
import javax.inject.Inject

@AndroidEntryPoint
class TVActivity : ComponentActivity() {

    @Inject lateinit var authService: OlorinAuthService
    @Inject lateinit var stringProvider: BayitStringProvider
    @Inject lateinit var watchNextManager: WatchNextManager
    @Inject @CdnBaseUrl lateinit var cdnBaseUrl: String

    private val pendingDeepLink = MutableStateFlow<Route?>(null)

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        parseDeepLink(intent)

        setContent {
            BayitTheme {
                ProvideBayitStrings(provider = stringProvider) {
                    val navController = rememberNavController()
                    val authState by authService.authState.collectAsStateWithLifecycle()
                    val deepLink by pendingDeepLink.collectAsStateWithLifecycle()

                    LaunchedEffect(authState) {
                        if (authState is AuthState.Unauthenticated) {
                            navController.navigate(Route.TVAuth) {
                                popUpTo(0) { inclusive = true }
                            }
                        }
                    }

                    LaunchedEffect(deepLink) {
                        deepLink?.let { route ->
                            navController.navigate(route)
                            pendingDeepLink.value = null
                        }
                    }

                    LaunchedEffect(Unit) {
                        SessionEventBus.sessionExpired.collect { authService.signOut() }
                    }

                    LaunchedEffect(Unit) {
                        WatchNextSyncWorker.enqueuePeriodicSync(applicationContext)
                    }

                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .background(DesignTokens.Colors.Background.primary),
                    ) {
                        TVNavHost(
                            navController = navController,
                            authState = authState,
                            cdnBaseUrl = cdnBaseUrl,
                            watchNextManager = watchNextManager,
                            modifier = Modifier.fillMaxSize(),
                        )
                    }
                }
            }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        parseDeepLink(intent)
    }

    private fun parseDeepLink(intent: Intent) {
        val data = intent.data ?: return
        if (data.scheme == "bayitplus" && data.host == "play") {
            val contentId = data.pathSegments.firstOrNull() ?: return
            val contentType = data.getQueryParameter("type").orEmpty()
            val resumeMs = data.getQueryParameter("resume")?.toLongOrNull() ?: 0L
            pendingDeepLink.value = Route.Player(
                contentId = contentId,
                contentType = contentType,
                resumePositionMs = resumeMs,
            )
        }
    }
}

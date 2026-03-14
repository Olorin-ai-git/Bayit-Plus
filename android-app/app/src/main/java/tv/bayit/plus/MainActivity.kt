package tv.bayit.plus

import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.key
import androidx.compose.ui.Modifier
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.compose.rememberNavController
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.drop
import kotlinx.coroutines.flow.filter
import kotlinx.coroutines.flow.first
import tv.bayit.plus.core.auth.AuthState
import tv.bayit.plus.core.auth.BiometricAuthService
import tv.bayit.plus.core.auth.GoogleSignInHelper
import tv.bayit.plus.core.auth.OlorinAuthService
import tv.bayit.plus.core.common.NetworkMonitor
import tv.bayit.plus.core.common.i18n.BayitStringProvider
import tv.bayit.plus.core.network.SessionEventBus
import tv.bayit.plus.designsystem.i18n.ProvideBayitStrings
import tv.bayit.plus.designsystem.theme.BayitTheme
import tv.bayit.plus.navigation.BayitNavHost
import tv.bayit.plus.navigation.DeepLinkHandler
import tv.bayit.plus.navigation.LastVisitedRouteManager
import tv.bayit.plus.navigation.Route
import tv.bayit.plus.ui.BayitMainScaffold
import javax.inject.Inject

@AndroidEntryPoint
class MainActivity : ComponentActivity() {

    @Inject lateinit var authService: OlorinAuthService
    @Inject lateinit var googleSignInHelper: GoogleSignInHelper
    @Inject lateinit var biometricAuthService: BiometricAuthService
    @Inject lateinit var stringProvider: BayitStringProvider
    @Inject lateinit var networkMonitor: NetworkMonitor
    @Inject lateinit var deepLinkHandler: DeepLinkHandler
    @Inject lateinit var lastVisitedRouteManager: LastVisitedRouteManager

    private val pendingDeepLink = MutableStateFlow<Route?>(null)
    internal val splashFinished = MutableStateFlow(false)

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setTheme(tv.bayit.plus.R.style.Theme_BayitPlus)
        enableEdgeToEdge()
        deepLinkHandler.handleIntent(intent)?.let { pendingDeepLink.value = it }

        setContent {
            BayitTheme {
                ProvideBayitStrings(provider = stringProvider) {
                    val navController = rememberNavController()
                    val authState by authService.authState.collectAsStateWithLifecycle()
                    val language by stringProvider.languageState.collectAsStateWithLifecycle()
                    val deepLink by pendingDeepLink.collectAsStateWithLifecycle()

                    LaunchedEffect(authState) {
                        splashFinished.filter { it }.first()
                        when (authState) {
                            is AuthState.Unauthenticated -> {
                                val userId = authService.currentUserId
                                if (userId != null) lastVisitedRouteManager.clear(userId)
                                navController.navigate(Route.Login) {
                                    popUpTo(Route.Splash) { inclusive = true }
                                }
                            }
                            is AuthState.Authenticated -> {
                                navController.navigate(Route.Home) {
                                    popUpTo(Route.Splash) { inclusive = true }
                                }
                                if (pendingDeepLink.value == null) {
                                    val userId = authService.currentUserId
                                    if (userId != null) {
                                        val restoredRoute = lastVisitedRouteManager.restore(userId)
                                        if (restoredRoute != null) {
                                            navController.navigate(restoredRoute) {
                                                launchSingleTop = true
                                            }
                                        }
                                    }
                                }
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
                        networkMonitor.isOnline
                            .drop(1) // skip initial emission to avoid racing the splash flow
                            .collect { online ->
                                if (!online && authState is AuthState.Authenticated) {
                                    navController.navigate(Route.Downloads) {
                                        launchSingleTop = true
                                    }
                                }
                            }
                    }

                    Surface(modifier = Modifier.fillMaxSize(), color = MaterialTheme.colorScheme.background) {
                        key(language) {
                            BayitMainScaffold(navController = navController, authState = authState) {
                                BayitNavHost(
                                    navController = navController,
                                    googleSignInHelper = googleSignInHelper,
                                    biometricAuthService = biometricAuthService,
                                    modifier = Modifier.fillMaxSize(),
                                )
                            }
                        }
                    }
                }
            }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        deepLinkHandler.handleIntent(intent)?.let { pendingDeepLink.value = it }
    }
}

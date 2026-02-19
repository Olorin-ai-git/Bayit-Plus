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

    private val pendingDeepLink = MutableStateFlow<Route?>(null)

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setTheme(tv.bayit.plus.R.style.Theme_BayitPlus)
        enableEdgeToEdge()
        parseTVLoginDeepLink(intent)?.let { pendingDeepLink.value = it }

        setContent {
            BayitTheme {
                ProvideBayitStrings(provider = stringProvider) {
                    val navController = rememberNavController()
                    val authState by authService.authState.collectAsStateWithLifecycle()
                    val language by stringProvider.languageState.collectAsStateWithLifecycle()
                    val deepLink by pendingDeepLink.collectAsStateWithLifecycle()

                    LaunchedEffect(authState) {
                        when (authState) {
                            is AuthState.Unauthenticated -> {
                                navController.navigate(Route.Login) {
                                    popUpTo(0) { inclusive = true }
                                }
                            }
                            is AuthState.Authenticated -> Unit
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
                        networkMonitor.isOnline.collect { online ->
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
        parseTVLoginDeepLink(intent)?.let { pendingDeepLink.value = it }
    }

    private fun parseTVLoginDeepLink(intent: Intent): Route? {
        if (intent.action != Intent.ACTION_VIEW) return null
        val uri = intent.data ?: return null
        if (uri.scheme != "bayitplus" || uri.host != "tv-login") return null
        val sessionId = uri.getQueryParameter("session") ?: return null
        val token = uri.getQueryParameter("token") ?: return null
        val expires = uri.getQueryParameter("expires") ?: return null
        return Route.TVLogin(sessionId = sessionId, token = token, expires = expires)
    }
}

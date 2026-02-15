package tv.bayit.plus

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.compose.rememberNavController
import dagger.hilt.android.AndroidEntryPoint
import tv.bayit.plus.core.auth.AuthState
import tv.bayit.plus.core.auth.FirebaseAuthService
import tv.bayit.plus.core.auth.GoogleSignInHelper
import tv.bayit.plus.designsystem.theme.BayitTheme
import tv.bayit.plus.navigation.BayitNavHost
import tv.bayit.plus.navigation.Route
import tv.bayit.plus.ui.BayitMainScaffold
import javax.inject.Inject

@AndroidEntryPoint
class MainActivity : ComponentActivity() {

    @Inject
    lateinit var authService: FirebaseAuthService

    @Inject
    lateinit var googleSignInHelper: GoogleSignInHelper

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Switch to main theme after splash
        setTheme(tv.bayit.plus.R.style.Theme_BayitPlus)

        enableEdgeToEdge()

        setContent {
            BayitTheme {
                val navController = rememberNavController()
                val authState by authService.authState.collectAsStateWithLifecycle()

                LaunchedEffect(authState) {
                    when (authState) {
                        is AuthState.Unauthenticated -> {
                            navController.navigate(Route.Login) {
                                popUpTo(0) { inclusive = true }
                            }
                        }
                        is AuthState.Authenticated -> {
                            // User is authenticated, proceed with normal flow
                        }
                    }
                }

                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    BayitMainScaffold(navController = navController) {
                        BayitNavHost(
                            navController = navController,
                            googleSignInHelper = googleSignInHelper,
                            modifier = Modifier.fillMaxSize()
                        )
                    }
                }
            }
        }
    }
}

package tv.bayit.plus.navigation

import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.toRoute
import tv.bayit.plus.core.auth.AuthState
import tv.bayit.plus.feature.tv.auth.TVAuthRoute
import tv.bayit.plus.feature.tv.home.TVHomeRoute
import tv.bayit.plus.feature.tv.player.TVPlayerRoute
import tv.bayit.plus.feature.tv.search.TVSearchRoute
import tv.bayit.plus.feature.tv.watchnext.WatchNextManager

@Composable
fun TVNavHost(
    navController: NavHostController,
    authState: AuthState,
    cdnBaseUrl: String,
    watchNextManager: WatchNextManager,
    modifier: Modifier = Modifier,
) {
    val startDestination = when (authState) {
        is AuthState.Authenticated -> Route.TVHome
        is AuthState.Unauthenticated -> Route.TVAuth
    }

    NavHost(
        navController = navController,
        startDestination = startDestination,
        modifier = modifier,
    ) {
        composable<Route.TVHome> {
            TVHomeRoute(
                onContentClick = { contentId, contentType ->
                    navController.navigate(
                        Route.Player(
                            contentId = contentId,
                            contentType = contentType,
                        ),
                    )
                },
                onSearchClick = { navController.navigate(Route.TVSearch) },
            )
        }

        composable<Route.Player> { backStackEntry ->
            val route = backStackEntry.toRoute<Route.Player>()
            TVPlayerRoute(
                contentId = route.contentId,
                contentType = route.contentType,
                resumePositionMs = route.resumePositionMs,
                streamUrl = "$cdnBaseUrl/content/${route.contentId}/stream.m3u8",
                onBack = { navController.popBackStack() },
                watchNextManager = watchNextManager,
            )
        }

        composable<Route.TVAuth> {
            TVAuthRoute(
                onAuthSuccess = {
                    navController.navigate(Route.TVHome) {
                        popUpTo(0) { inclusive = true }
                    }
                },
            )
        }

        composable<Route.TVSearch> {
            TVSearchRoute(
                onContentClick = { contentId, contentType ->
                    navController.navigate(
                        Route.Player(
                            contentId = contentId,
                            contentType = contentType,
                        ),
                    )
                },
                onBack = { navController.popBackStack() },
            )
        }
    }
}

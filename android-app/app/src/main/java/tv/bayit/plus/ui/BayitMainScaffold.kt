package tv.bayit.plus.ui

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Scaffold
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavHostController
import androidx.navigation.compose.currentBackStackEntryAsState
import tv.bayit.plus.BuildConfig
import tv.bayit.plus.core.auth.AuthState
import tv.bayit.plus.navigation.AppTab
import tv.bayit.plus.navigation.Route
import tv.bayit.plus.navigation.isAuthRoutePattern
import tv.bayit.plus.ui.components.GlassBottomNavBar
import tv.bayit.plus.ui.components.MiniAudioPlayerBar
import tv.bayit.plus.ui.components.PiPWidgetContainer
import tv.bayit.plus.ui.components.TopAppBar
import tv.bayit.plus.ui.components.VoiceAssistantFAB
import tv.bayit.plus.ui.components.VoiceAssistantModal
import tv.bayit.plus.ui.components.WidgetDock
import tv.bayit.plus.ui.components.rememberBreadcrumbTrail
import tv.bayit.plus.ui.viewmodel.MiniPlayerViewModel
import tv.bayit.plus.ui.viewmodel.NavBarViewModel
import tv.bayit.plus.ui.viewmodel.WidgetDockViewModel

@Composable
fun BayitMainScaffold(
    navController: NavHostController,
    authState: AuthState,
    widgetDockViewModel: WidgetDockViewModel = hiltViewModel(),
    navBarViewModel: NavBarViewModel = hiltViewModel(),
    miniPlayerViewModel: MiniPlayerViewModel = hiltViewModel(),
    content: @Composable (PaddingValues) -> Unit,
) {
    val isAuthenticated = authState is AuthState.Authenticated

    /**
     * Navigate to route with auth guard.
     * If user is not authenticated, navigate to Login instead.
     */
    fun navigateWithAuthGuard(route: Route) {
        if (isAuthenticated) {
            navController.navigate(route)
        } else {
            navController.navigate(Route.Login) {
                popUpTo(0) { inclusive = true }
            }
        }
    }
    val visibleTabs = remember { AppTab.visibleTabs(BuildConfig.OWNER_MODE) }
    var selectedTab by remember { mutableStateOf(AppTab.HOME) }
    var showVoiceModal by remember { mutableStateOf(false) }
    val backStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = backStackEntry?.destination?.route

    val widgetDockState by widgetDockViewModel.uiState.collectAsStateWithLifecycle()
    val userPhotoUrl by navBarViewModel.userPhotoUrl.collectAsStateWithLifecycle()
    val userName by navBarViewModel.userName.collectAsStateWithLifecycle()
    val currentLanguage by navBarViewModel.currentLanguage.collectAsStateWithLifecycle()
    val audioState by miniPlayerViewModel.audioState.collectAsStateWithLifecycle()

    val isRootTab = visibleTabs.any { tab ->
        tab.route::class.qualifiedName == currentRoute
    }

    val isContentDetailPage = currentRoute?.let { route ->
        listOf(
            Route.MovieDetail::class.qualifiedName,
            Route.SeriesDetail::class.qualifiedName,
            Route.CollectionDetail::class.qualifiedName,
        ).any { qualifiedName -> qualifiedName != null && route.startsWith(qualifiedName) }
    } == true

    val breadcrumbs = rememberBreadcrumbTrail(navController)

    val isAuthScreen = currentRoute?.let { isAuthRoutePattern(it) } == true
    val isPlayerScreen = currentRoute?.startsWith(Route.Player::class.qualifiedName.orEmpty()) == true
    val hideChrome = isAuthScreen || isPlayerScreen

    Scaffold(
        topBar = {
            if (!hideChrome) {
                TopAppBar(
                    showBack = !isRootTab,
                    onBack = { navController.popBackStack() },
                    breadcrumbs = breadcrumbs,
                    onBreadcrumbClick = { entry ->
                        repeat(entry.popCount) {
                            navController.popBackStack()
                        }
                    },
                    userPhotoUrl = userPhotoUrl,
                    userName = userName,
                    currentLanguage = currentLanguage,
                    onProfileClick = { navigateWithAuthGuard(Route.Profile) },
                    onSettingsClick = { navigateWithAuthGuard(Route.Settings) },
                    onBYOCClick = { navigateWithAuthGuard(Route.BYOCSettings) },
                    onLanguageSelected = { code -> navBarViewModel.setLanguage(code) },
                    onHomeClick = {
                        selectedTab = AppTab.HOME
                        navController.navigate(AppTab.HOME.route) {
                            popUpTo(navController.graph.startDestinationId) { saveState = true }
                            launchSingleTop = true
                            restoreState = true
                        }
                    },
                    onPlaylistClick = { navigateWithAuthGuard(Route.Playlist) },
                    onZehAniClick = {
                        selectedTab = AppTab.ZEH_ANI
                        navController.navigate(AppTab.ZEH_ANI.route) {
                            popUpTo(navController.graph.startDestinationId) {
                                saveState = true
                            }
                            launchSingleTop = true
                            restoreState = true
                        }
                    },
                )
            }
        },
        bottomBar = {
            if (!hideChrome) {
                Column {
                    MiniAudioPlayerBar(
                        audioState = audioState,
                        isVisible = audioState.isActive,
                        onTogglePlayPause = miniPlayerViewModel::togglePlayPause,
                        onSkipBackward = miniPlayerViewModel::skipBackward,
                        onSkipForward = miniPlayerViewModel::skipForward,
                        onClose = miniPlayerViewModel::stop,
                    )
                    if (isRootTab || isContentDetailPage) {
                        GlassBottomNavBar(
                            selectedTab = selectedTab,
                            onTabSelected = { tab ->
                                selectedTab = tab
                                navController.navigate(tab.route) {
                                    popUpTo(navController.graph.startDestinationId) {
                                        saveState = true
                                    }
                                    launchSingleTop = true
                                    restoreState = true
                                }
                            },
                            visibleTabs = visibleTabs,
                        )
                    }
                }
            }
        },
        floatingActionButton = {
            if (isAuthenticated && !isPlayerScreen) {
                VoiceAssistantFAB(onClick = { showVoiceModal = true })
            }
        },
    ) { paddingValues ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues),
        ) {
            content(paddingValues)

            widgetDockViewModel.getRestoredWidgets().forEachIndexed { index, widget ->
                PiPWidgetContainer(
                    widget = widget,
                    initialPosition = Offset(100f, 100f + (index * 220f)),
                    onMinimize = { widgetDockViewModel.minimizeWidget(widget.id) },
                    onClose = { widgetDockViewModel.minimizeWidget(widget.id) }
                )
            }

            WidgetDock(
                minimizedWidgets = widgetDockViewModel.getMinimizedWidgets(),
                isDockVisible = widgetDockState.isDockVisible,
                onWidgetClick = { widgetId ->
                    widgetDockViewModel.toggleMinimize(widgetId)
                },
                onCloseDock = { widgetDockViewModel.hideDock() }
            )
        }
    }

    if (showVoiceModal) {
        VoiceAssistantModal(
            onDismiss = { showVoiceModal = false },
            onNavigateToOnboarding = {
                showVoiceModal = false
                navController.navigate(Route.OnboardingAI)
            }
        )
    }
}

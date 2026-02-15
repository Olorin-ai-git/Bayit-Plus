package tv.bayit.plus.ui

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Scaffold
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavHostController
import androidx.navigation.compose.currentBackStackEntryAsState
import tv.bayit.plus.navigation.AppTab
import tv.bayit.plus.navigation.Route
import tv.bayit.plus.ui.components.BreadcrumbBar
import tv.bayit.plus.ui.components.GlassBottomNavBar
import tv.bayit.plus.ui.components.PiPWidgetContainer
import tv.bayit.plus.ui.components.TopAppBar
import tv.bayit.plus.ui.components.VoiceAssistantFAB
import tv.bayit.plus.ui.components.WidgetDock
import tv.bayit.plus.ui.components.rememberBreadcrumbTrail
import tv.bayit.plus.ui.viewmodel.WidgetDockViewModel

@Composable
fun BayitMainScaffold(
    navController: NavHostController,
    widgetDockViewModel: WidgetDockViewModel = hiltViewModel(),
    content: @Composable (PaddingValues) -> Unit,
) {
    var selectedTab by remember { mutableStateOf(AppTab.HOME) }
    var showVoiceModal by remember { mutableStateOf(false) }
    val backStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = backStackEntry?.destination?.route

    val widgetDockState by widgetDockViewModel.uiState.collectAsState()

    val isRootTab = AppTab.entries.any { tab ->
        tab.route::class.qualifiedName == currentRoute
    }

    val breadcrumbs = rememberBreadcrumbTrail(navController)

    Scaffold(
        topBar = {
            if (isRootTab) {
                TopAppBar(
                    onProfileClick = { navController.navigate(Route.Profile) },
                    onLanguageClick = { navController.navigate(Route.LanguageSettings) },
                )
            } else if (breadcrumbs.size >= 2) {
                BreadcrumbBar(
                    entries = breadcrumbs,
                    onEntryClick = { entry ->
                        repeat(entry.popCount) {
                            navController.popBackStack()
                        }
                    },
                )
            }
        },
        bottomBar = {
            if (isRootTab) {
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
                )
            }
        },
        floatingActionButton = {
            if (isRootTab) {
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
        // TODO: Implement VoiceAssistantModal when available
        // VoiceAssistantModal(onDismiss = { showVoiceModal = false })
    }
}

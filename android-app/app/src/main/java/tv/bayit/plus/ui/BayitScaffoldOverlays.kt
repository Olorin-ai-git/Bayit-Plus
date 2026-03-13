package tv.bayit.plus.ui

import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.geometry.Offset
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavHostController
import tv.bayit.plus.navigation.Route
import tv.bayit.plus.ui.components.PiPWidgetContainer
import tv.bayit.plus.ui.components.VoiceAssistantModal
import tv.bayit.plus.ui.components.WidgetDock
import tv.bayit.plus.ui.viewmodel.WidgetDockViewModel

/**
 * Renders the floating PiP widgets, widget dock, and voice assistant modal that sit above the
 * main scaffold content. Extracted to keep [BayitMainScaffold] within the 200-line file limit.
 */
@Composable
internal fun BayitScaffoldOverlays(
    showVoiceModal: Boolean,
    onDismissVoiceModal: () -> Unit,
    navController: NavHostController,
    widgetDockViewModel: WidgetDockViewModel = hiltViewModel(),
) {
    val widgetDockState by widgetDockViewModel.uiState.collectAsStateWithLifecycle()

    widgetDockViewModel.getRestoredWidgets().forEachIndexed { index, widget ->
        PiPWidgetContainer(
            widget = widget,
            initialPosition = Offset(100f, 100f + (index * 220f)),
            onMinimize = { widgetDockViewModel.minimizeWidget(widget.id) },
            onClose = { widgetDockViewModel.minimizeWidget(widget.id) },
        )
    }

    WidgetDock(
        minimizedWidgets = widgetDockViewModel.getMinimizedWidgets(),
        isDockVisible = widgetDockState.isDockVisible,
        onWidgetClick = { widgetId -> widgetDockViewModel.toggleMinimize(widgetId) },
        onCloseDock = { widgetDockViewModel.hideDock() },
    )

    if (showVoiceModal) {
        VoiceAssistantModal(
            onDismiss = onDismissVoiceModal,
            onNavigateToOnboarding = {
                onDismissVoiceModal()
                navController.navigate(Route.OnboardingAI)
            },
        )
    }
}

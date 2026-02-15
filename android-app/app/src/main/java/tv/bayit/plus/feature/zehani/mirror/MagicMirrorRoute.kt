package tv.bayit.plus.feature.zehani.mirror

import androidx.compose.runtime.Composable
import androidx.hilt.navigation.compose.hiltViewModel
import tv.bayit.plus.ui.screens.zehani.MagicMirrorScreen
import tv.bayit.plus.ui.viewmodel.zehani.MagicMirrorViewModel

@Composable
fun MagicMirrorRoute(
    onNavigateBack: () -> Unit,
    viewModel: MagicMirrorViewModel = hiltViewModel()
) {
    MagicMirrorScreen(
        profileId = "current", // Will be replaced with actual profile ID
        onNavigateBack = onNavigateBack,
        viewModel = viewModel
    )
}

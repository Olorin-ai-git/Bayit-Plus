package tv.bayit.plus.feature.zehani.highlights

import androidx.compose.runtime.Composable
import androidx.hilt.navigation.compose.hiltViewModel
import tv.bayit.plus.ui.screens.zehani.HighlightReelsScreen
import tv.bayit.plus.ui.viewmodel.zehani.HighlightReelsViewModel

@Composable
fun HighlightsRoute(
    onNavigateBack: () -> Unit,
    viewModel: HighlightReelsViewModel = hiltViewModel()
) {
    HighlightReelsScreen(
        profileId = "current", // Will be replaced with actual profile ID
        avatarId = "default", // Will be replaced with actual avatar ID
        onNavigateBack = onNavigateBack,
        viewModel = viewModel
    )
}

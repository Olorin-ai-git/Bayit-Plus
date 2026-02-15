package tv.bayit.plus.feature.zehani.feedback

import androidx.compose.runtime.Composable
import androidx.hilt.navigation.compose.hiltViewModel
import tv.bayit.plus.ui.screens.zehani.FeedbackScreen
import tv.bayit.plus.ui.viewmodel.zehani.FeedbackViewModel

@Composable
fun FeedbackRoute(
    onNavigateBack: () -> Unit,
    viewModel: FeedbackViewModel = hiltViewModel()
) {
    FeedbackScreen(
        profileId = "current", // Will be replaced with actual profile ID
        onNavigateBack = onNavigateBack,
        viewModel = viewModel
    )
}

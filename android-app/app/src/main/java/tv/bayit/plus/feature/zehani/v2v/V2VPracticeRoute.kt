package tv.bayit.plus.feature.zehani.v2v

import androidx.compose.runtime.Composable
import androidx.hilt.navigation.compose.hiltViewModel
import tv.bayit.plus.ui.screens.zehani.V2VPracticeScreen
import tv.bayit.plus.ui.viewmodel.zehani.V2VPracticeViewModel

@Composable
fun V2VPracticeRoute(
    onNavigateBack: () -> Unit,
    viewModel: V2VPracticeViewModel = hiltViewModel()
) {
    V2VPracticeScreen(
        profileId = "current", // Will be replaced with actual profile ID
        avatarId = "default", // Will be replaced with actual avatar ID
        onNavigateBack = onNavigateBack,
        viewModel = viewModel
    )
}

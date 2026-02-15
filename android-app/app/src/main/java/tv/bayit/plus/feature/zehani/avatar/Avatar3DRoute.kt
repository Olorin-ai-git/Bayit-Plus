package tv.bayit.plus.feature.zehani.avatar

import androidx.compose.runtime.Composable
import androidx.hilt.navigation.compose.hiltViewModel
import tv.bayit.plus.ui.screens.zehani.Avatar3DScreen
import tv.bayit.plus.ui.viewmodel.zehani.Avatar3DViewModel

@Composable
fun Avatar3DRoute(
    onNavigateBack: () -> Unit,
    viewModel: Avatar3DViewModel = hiltViewModel()
) {
    Avatar3DScreen(
        avatarId = "default", // Will be replaced with actual avatar ID
        onNavigateBack = onNavigateBack,
        viewModel = viewModel
    )
}

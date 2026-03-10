package tv.bayit.plus.feature.discover.ui

import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import tv.bayit.plus.feature.discover.DiscoverViewModel
import tv.bayit.plus.feature.discover.WalkthroughNavTarget

@Composable
fun DiscoverRoute(
    onNavigateToFeatureDetail: (featureId: String) -> Unit = {},
    onNavigateToPlayer: (contentId: String, contentType: String) -> Unit = { _, _ -> },
    onNavigateToZehAni: () -> Unit = {},
    viewModel: DiscoverViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    DiscoverScreen(
        uiState = uiState,
        onFeatureClick = { feature ->
            viewModel.selectFeature(feature)
        },
        onDismissDetail = {
            viewModel.clearSelection()
        },
        onStartWalkthrough = { feature ->
            val target = viewModel.startWalkthrough(feature) ?: return@DiscoverScreen
            when (target) {
                is WalkthroughNavTarget.Player ->
                    onNavigateToPlayer(target.contentId, target.contentType)
                is WalkthroughNavTarget.ZehAni ->
                    onNavigateToZehAni()
                is WalkthroughNavTarget.DeepLink ->
                    onNavigateToFeatureDetail(target.featureId)
            }
        },
        onNavigateToPlayer = onNavigateToPlayer,
        onNavigateToZehAni = onNavigateToZehAni,
    )
}

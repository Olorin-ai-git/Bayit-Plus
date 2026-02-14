package tv.bayit.plus.feature.zehani

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.GridItemSpan
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import tv.bayit.plus.designsystem.component.GlassButton
import tv.bayit.plus.designsystem.component.GlassCard
import tv.bayit.plus.designsystem.component.GlassLoadingIndicator
import tv.bayit.plus.designsystem.component.GlassTopBar
import tv.bayit.plus.designsystem.theme.DesignTokens

private const val GRID_COLUMNS = 2

private val menuCards = listOf(
    ZehAniMenuCard(ZehAniFeature.MAGIC_MIRROR, "Magic Mirror", "Identify faces in content"),
    ZehAniMenuCard(ZehAniFeature.V2V_PRACTICE, "V2V Practice", "Voice-to-voice pronunciation"),
    ZehAniMenuCard(ZehAniFeature.AVATAR_3D, "3D Avatar", "Your personalized avatar"),
    ZehAniMenuCard(ZehAniFeature.HIGHLIGHTS, "Highlights", "Your saved highlight clips"),
)

@Composable
fun ZehAniDashboardRoute(
    onNavigateToMagicMirror: () -> Unit,
    onNavigateToV2V: () -> Unit,
    onNavigateToAvatar3D: () -> Unit,
    onNavigateToHighlights: () -> Unit,
    onNavigateBack: () -> Unit,
    modifier: Modifier = Modifier,
    viewModel: ZehAniDashboardViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    ZehAniDashboardScreen(
        uiState = uiState,
        onFeatureSelected = { feature ->
            when (feature) {
                ZehAniFeature.MAGIC_MIRROR -> onNavigateToMagicMirror()
                ZehAniFeature.V2V_PRACTICE -> onNavigateToV2V()
                ZehAniFeature.AVATAR_3D -> onNavigateToAvatar3D()
                ZehAniFeature.HIGHLIGHTS -> onNavigateToHighlights()
            }
        },
        onRetry = viewModel::retry,
        modifier = modifier,
    )
}

@Composable
internal fun ZehAniDashboardScreen(
    uiState: ZehAniDashboardUiState,
    onFeatureSelected: (ZehAniFeature) -> Unit,
    onRetry: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(modifier = modifier.fillMaxSize()) {
        GlassTopBar(title = "Zeh Ani")
        when (uiState) {
            is ZehAniDashboardUiState.Loading -> GlassLoadingIndicator()
            is ZehAniDashboardUiState.Success -> DashboardContent(
                historyCount = uiState.historyCount,
                onFeatureSelected = onFeatureSelected,
            )
            is ZehAniDashboardUiState.Error -> DashboardError(
                message = uiState.message,
                onRetry = onRetry,
            )
        }
    }
}

@Composable
private fun DashboardContent(
    historyCount: Int,
    onFeatureSelected: (ZehAniFeature) -> Unit,
) {
    LazyVerticalGrid(
        columns = GridCells.Fixed(GRID_COLUMNS),
        contentPadding = PaddingValues(DesignTokens.Spacing.base),
        verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md),
        horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md),
        modifier = Modifier.fillMaxSize(),
    ) {
        item(key = "history_count", span = { GridItemSpan(GRID_COLUMNS) }) {
            GlassCard(modifier = Modifier.fillMaxWidth()) {
                Column(verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.xs)) {
                    Text(
                        text = "Recognition History",
                        style = MaterialTheme.typography.titleMedium,
                        color = DesignTokens.Colors.Text.primary,
                        fontWeight = FontWeight.SemiBold,
                    )
                    Text(
                        text = "$historyCount identifications",
                        style = MaterialTheme.typography.bodyMedium,
                        color = DesignTokens.Colors.Text.secondary,
                    )
                }
            }
        }
        items(items = menuCards, key = { it.id.name }) { card ->
            FeatureMenuCard(card = card, onClick = { onFeatureSelected(card.id) })
        }
    }
}

@Composable
private fun FeatureMenuCard(card: ZehAniMenuCard, onClick: () -> Unit) {
    GlassCard(modifier = Modifier.fillMaxWidth().clickable(onClick = onClick)) {
        Column(verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.xs)) {
            Text(
                text = card.title,
                style = MaterialTheme.typography.titleSmall,
                color = DesignTokens.Colors.Text.primary,
                fontWeight = FontWeight.SemiBold,
            )
            Text(
                text = card.subtitle,
                style = MaterialTheme.typography.bodySmall,
                color = DesignTokens.Colors.Text.secondary,
            )
        }
    }
}

@Composable
private fun DashboardError(message: String, onRetry: () -> Unit) {
    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md),
        ) {
            Text(
                text = message,
                style = MaterialTheme.typography.bodyLarge,
                color = DesignTokens.Colors.Semantic.error,
            )
            GlassButton(text = "Retry", onClick = onRetry)
        }
    }
}

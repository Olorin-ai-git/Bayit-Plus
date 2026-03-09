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
    ZehAniMenuCard(ZehAniFeature.MAGIC_MIRROR, "Magic Mirror", "Daily greetings and face ID"),
    ZehAniMenuCard(ZehAniFeature.V2V_PRACTICE, "V2V Practice", "Voice-to-voice pronunciation"),
    ZehAniMenuCard(ZehAniFeature.AVATAR_3D, "3D Avatar", "Your personalized avatar mesh"),
    ZehAniMenuCard(ZehAniFeature.MOVIE_INTERACTIONS, "Movie Interactions", "Browse and talk to movie characters"),
    ZehAniMenuCard(ZehAniFeature.CONTACTS, "Contacts", "WhatsApp sharing contacts"),
    ZehAniMenuCard(ZehAniFeature.FEEDBACK, "Feedback", "Share your experience"),
    ZehAniMenuCard(ZehAniFeature.CONSENT, "Consent", "Biometric consent management"),
    ZehAniMenuCard(ZehAniFeature.CHESS, "Chess", "Play chess with friends and family"),
)

@Composable
fun ZehAniDashboardRoute(
    onNavigateToMagicMirror: (profileId: String) -> Unit,
    onNavigateToV2V: (profileId: String) -> Unit,
    onNavigateToAvatar3D: (profileId: String) -> Unit,
    onNavigateToMovieInteractions: (profileId: String) -> Unit,
    onNavigateToContacts: (profileId: String) -> Unit,
    onNavigateToFeedback: (profileId: String) -> Unit,
    onNavigateToConsent: (profileId: String) -> Unit,
    onNavigateToChess: () -> Unit,
    onNavigateBack: () -> Unit,
    modifier: Modifier = Modifier,
    viewModel: ZehAniDashboardViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    ZehAniDashboardScreen(
        uiState = uiState,
        onFeatureSelected = { feature ->
            (uiState as? ZehAniDashboardUiState.Success)?.profileId?.let { profileId ->
                when (feature) {
                    ZehAniFeature.MAGIC_MIRROR -> onNavigateToMagicMirror(profileId)
                    ZehAniFeature.V2V_PRACTICE -> onNavigateToV2V(profileId)
                    ZehAniFeature.AVATAR_3D -> onNavigateToAvatar3D(profileId)
                    ZehAniFeature.MOVIE_INTERACTIONS -> onNavigateToMovieInteractions(profileId)
                    ZehAniFeature.CONTACTS -> onNavigateToContacts(profileId)
                    ZehAniFeature.FEEDBACK -> onNavigateToFeedback(profileId)
                    ZehAniFeature.CONSENT -> onNavigateToConsent(profileId)
                    ZehAniFeature.CHESS -> onNavigateToChess()
                }
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
                activeConsentCount = uiState.activeConsentCount,
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
    activeConsentCount: Int,
    onFeatureSelected: (ZehAniFeature) -> Unit,
) {
    LazyVerticalGrid(
        columns = GridCells.Fixed(GRID_COLUMNS),
        contentPadding = PaddingValues(DesignTokens.Spacing.base),
        verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md),
        horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md),
        modifier = Modifier.fillMaxSize(),
    ) {
        item(key = "consent_status", span = { GridItemSpan(GRID_COLUMNS) }) {
            GlassCard(modifier = Modifier.fillMaxWidth()) {
                Column(verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.xs)) {
                    Text(
                        text = "Biometric Consent",
                        style = MaterialTheme.typography.titleMedium,
                        color = DesignTokens.Colors.Text.primary,
                        fontWeight = FontWeight.SemiBold,
                    )
                    Text(
                        text = "$activeConsentCount active consents",
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

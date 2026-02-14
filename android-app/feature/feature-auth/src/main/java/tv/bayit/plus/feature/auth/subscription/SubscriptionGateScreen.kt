package tv.bayit.plus.feature.auth.subscription

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import tv.bayit.plus.designsystem.component.GlassButton
import tv.bayit.plus.designsystem.component.GlassCard
import tv.bayit.plus.designsystem.component.GlassLoadingIndicator
import tv.bayit.plus.designsystem.component.GlassTopBar
import tv.bayit.plus.designsystem.theme.DesignTokens

@Composable
fun SubscriptionGateRoute(
    onNavigateToSubscribe: () -> Unit,
    onNavigateBack: () -> Unit,
    modifier: Modifier = Modifier,
    viewModel: SubscriptionGateViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    SubscriptionGateScreen(
        uiState = uiState,
        onNavigateToSubscribe = onNavigateToSubscribe,
        onNavigateBack = onNavigateBack,
        onRetry = viewModel::retry,
        modifier = modifier,
    )
}

@Composable
internal fun SubscriptionGateScreen(
    uiState: SubscriptionGateUiState,
    onNavigateToSubscribe: () -> Unit,
    onNavigateBack: () -> Unit,
    onRetry: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(modifier = modifier.fillMaxSize()) {
        GlassTopBar(title = "Premium Feature")
        when (uiState) {
            is SubscriptionGateUiState.Loading -> GlassLoadingIndicator()
            is SubscriptionGateUiState.Error -> ErrorContent(message = uiState.message, onRetry = onRetry)
            is SubscriptionGateUiState.GateRequired -> {
                if (uiState.requiresSubscription) {
                    GateContent(
                        featureName = uiState.featureName,
                        onNavigateToSubscribe = onNavigateToSubscribe,
                        onNavigateBack = onNavigateBack,
                    )
                } else {
                    Text(
                        text = "You have access to this feature!",
                        color = DesignTokens.Colors.Semantic.success,
                        modifier = Modifier.padding(DesignTokens.Spacing.base),
                    )
                }
            }
        }
    }
}

@Composable
private fun GateContent(
    featureName: String,
    onNavigateToSubscribe: () -> Unit,
    onNavigateBack: () -> Unit,
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(DesignTokens.Spacing.base),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        GlassCard(modifier = Modifier.fillMaxWidth()) {
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.lg),
            ) {
                Text(
                    text = "\uD83D\uDD12",
                    fontSize = DesignTokens.FontSize.xxxl,
                )
                Text(
                    text = "Premium Feature",
                    style = MaterialTheme.typography.titleLarge,
                    color = DesignTokens.Colors.Text.primary,
                    fontWeight = FontWeight.Bold,
                    textAlign = TextAlign.Center,
                )
                Text(
                    text = "$featureName is available with a Bayit+ subscription.",
                    style = MaterialTheme.typography.bodyLarge,
                    color = DesignTokens.Colors.Text.secondary,
                    textAlign = TextAlign.Center,
                )
                Spacer(Modifier.height(DesignTokens.Spacing.md))
                Text(
                    text = "Upgrade to unlock:\n\n• Unlimited streaming\n• Offline downloads\n• Live TV with dubbing\n• AI features\n• And much more!",
                    style = MaterialTheme.typography.bodyMedium,
                    color = DesignTokens.Colors.Text.secondary,
                    textAlign = TextAlign.Start,
                )
            }
        }

        Spacer(Modifier.height(DesignTokens.Spacing.xl))

        GlassButton(
            text = "Subscribe Now",
            onClick = onNavigateToSubscribe,
            modifier = Modifier.fillMaxWidth(),
        )

        Spacer(Modifier.height(DesignTokens.Spacing.sm))

        GlassButton(
            text = "Go Back",
            onClick = onNavigateBack,
            isPrimary = false,
            modifier = Modifier.fillMaxWidth(),
        )
    }
}

@Composable
private fun ErrorContent(message: String, onRetry: () -> Unit) {
    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md),
        ) {
            Text(text = message, color = DesignTokens.Colors.Semantic.error, style = MaterialTheme.typography.bodyLarge)
            GlassButton(text = "Retry", onClick = onRetry)
        }
    }
}

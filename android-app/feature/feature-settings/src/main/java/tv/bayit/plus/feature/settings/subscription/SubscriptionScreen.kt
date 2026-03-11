package tv.bayit.plus.feature.settings.subscription

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import tv.bayit.plus.designsystem.component.GlassBadge
import tv.bayit.plus.designsystem.component.GlassButton
import tv.bayit.plus.designsystem.component.GlassCard
import tv.bayit.plus.designsystem.component.GlassLoadingIndicator
import tv.bayit.plus.designsystem.component.GlassTopBar
import tv.bayit.plus.designsystem.theme.DesignTokens
import tv.bayit.plus.designsystem.i18n.bayitString

@Composable
fun SubscriptionRoute(
    onNavigateBack: () -> Unit,
    onNavigateToUpgrade: () -> Unit,
    modifier: Modifier = Modifier,
    viewModel: SubscriptionViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val context = androidx.compose.ui.platform.LocalContext.current
    SubscriptionScreen(
        uiState = uiState,
        onNavigateBack = onNavigateBack,
        onUpgrade = onNavigateToUpgrade,
        onManageSubscription = { viewModel.manageSubscription(context) },
        onRetry = viewModel::retry,
        modifier = modifier,
    )
}

@Composable
internal fun SubscriptionScreen(
    uiState: SubscriptionUiState,
    onNavigateBack: () -> Unit,
    onUpgrade: () -> Unit,
    onManageSubscription: () -> Unit,
    onRetry: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(modifier = modifier.fillMaxSize()) {
        GlassTopBar(
            title = bayitString("settings.subscription.title"),
            navigationIcon = {
                IconButton(onClick = onNavigateBack) {
                    Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = bayitString("common.back"), tint = DesignTokens.Colors.Text.primary)
                }
            },
        )
        when (uiState) {
            is SubscriptionUiState.Loading -> GlassLoadingIndicator()
            is SubscriptionUiState.Error -> SubscriptionErrorContent(message = uiState.message, onRetry = onRetry)
            is SubscriptionUiState.Success -> SubscriptionContent(
                state = uiState, onUpgrade = onUpgrade, onManageSubscription = onManageSubscription,
            )
        }
    }
}

@Composable
private fun SubscriptionContent(
    state: SubscriptionUiState.Success,
    onUpgrade: () -> Unit,
    onManageSubscription: () -> Unit,
) {
    LazyColumn(
        modifier = Modifier.fillMaxSize().padding(horizontal = DesignTokens.Spacing.base),
        verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm),
    ) {
        item { Spacer(Modifier.height(DesignTokens.Spacing.base)) }
        item {
            GlassCard(modifier = Modifier.fillMaxWidth()) {
                Column {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(text = bayitString("settings.subscription.currentPlan"), color = DesignTokens.Colors.Text.muted, style = MaterialTheme.typography.bodySmall)
                        if (state.isBetaUser) {
                            GlassBadge(count = 1, modifier = Modifier.padding(start = DesignTokens.Spacing.sm))
                        }
                    }
                    Text(
                        text = state.plan.replaceFirstChar { it.titlecase() },
                        color = DesignTokens.Colors.Primary.light,
                        style = MaterialTheme.typography.headlineSmall,
                    )
                    Spacer(Modifier.height(DesignTokens.Spacing.xs))
                    Text(text = "${bayitString("settings.subscription.status")}: ${state.status}", color = DesignTokens.Colors.Text.secondary, style = MaterialTheme.typography.bodyMedium)
                    if (state.startDate.isNotEmpty()) {
                        Text(text = "${bayitString("settings.subscription.since")}: ${state.startDate}", color = DesignTokens.Colors.Text.muted, style = MaterialTheme.typography.bodySmall)
                    }
                    if (state.endDate.isNotEmpty()) {
                        Text(text = "${bayitString("settings.subscription.renews")}: ${state.endDate}", color = DesignTokens.Colors.Text.muted, style = MaterialTheme.typography.bodySmall)
                    }
                }
            }
        }
        if (state.isBetaUser) {
            item {
                val pct = if (state.totalCredits > 0) state.remainingCredits.toFloat() / state.totalCredits else 0f
                val statusColor = when {
                    pct > 0.20f -> DesignTokens.Colors.Semantic.success
                    pct > 0.05f -> DesignTokens.Colors.Semantic.warning
                    else -> DesignTokens.Colors.Semantic.error
                }
                GlassCard(modifier = Modifier.fillMaxWidth()) {
                    Column {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(imageVector = Icons.Default.AutoAwesome, contentDescription = null, tint = statusColor, modifier = Modifier.size(20.dp))
                            Spacer(Modifier.padding(start = DesignTokens.Spacing.sm))
                            Text(text = "${state.remainingCredits} / ${state.totalCredits}", style = MaterialTheme.typography.titleMedium, color = DesignTokens.Colors.Text.primary)
                        }
                        Spacer(Modifier.height(DesignTokens.Spacing.xs))
                        Text(
                            text = bayitString("plus.badge.creditsRemaining").replace("{{count}}", state.remainingCredits.toString()),
                            color = DesignTokens.Colors.Text.muted,
                            style = MaterialTheme.typography.bodySmall,
                        )
                        Spacer(Modifier.height(DesignTokens.Spacing.sm))
                        LinearProgressIndicator(progress = { pct }, color = statusColor, trackColor = DesignTokens.Colors.Text.muted.copy(alpha = 0.2f), modifier = Modifier.fillMaxWidth().height(4.dp).clip(RoundedCornerShape(2.dp)))
                    }
                }
            }
        }
        item {
            GlassCard(modifier = Modifier.fillMaxWidth()) {
                Column {
                    Text(text = bayitString("settings.subscription.featuresIncluded"), color = DesignTokens.Colors.Text.primary, style = MaterialTheme.typography.titleMedium)
                    Spacer(Modifier.height(DesignTokens.Spacing.sm))
                    FeatureRow(text = bayitString("settings.subscription.featureLiveTV"))
                    FeatureRow(text = bayitString("settings.subscription.featureVOD"))
                    FeatureRow(text = bayitString("settings.subscription.featureRadio"))
                    FeatureRow(text = bayitString("settings.subscription.featureDownloads"))
                    if (state.isBetaUser) {
                        FeatureRow(text = bayitString("settings.subscription.featureBeta500"))
                    }
                }
            }
        }
        item {
            Spacer(Modifier.height(DesignTokens.Spacing.sm))
            GlassButton(text = bayitString("common.upgrade"), onClick = onUpgrade, modifier = Modifier.fillMaxWidth())
            Spacer(Modifier.height(DesignTokens.Spacing.sm))
            GlassButton(text = bayitString("settings.subscription.manageOnGooglePlay"), onClick = onManageSubscription, modifier = Modifier.fillMaxWidth())
            Spacer(Modifier.height(DesignTokens.Spacing.xxl))
        }
    }
}

@Composable
private fun FeatureRow(text: String) {
    Row(modifier = Modifier.padding(vertical = DesignTokens.Spacing.xs)) {
        Text(text = "  -  ", color = DesignTokens.Colors.Semantic.success, style = MaterialTheme.typography.bodyMedium)
        Text(text = text, color = DesignTokens.Colors.Text.secondary, style = MaterialTheme.typography.bodyMedium)
    }
}

@Composable
private fun SubscriptionErrorContent(message: String, onRetry: () -> Unit) {
    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md)) {
            Text(text = message, style = MaterialTheme.typography.bodyLarge, color = DesignTokens.Colors.Semantic.error)
            GlassButton(text = bayitString("common.retry"), onClick = onRetry)
        }
    }
}

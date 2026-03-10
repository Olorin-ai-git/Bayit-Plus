package tv.bayit.plus.feature.settings.billing

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import tv.bayit.plus.designsystem.component.GlassButton
import tv.bayit.plus.designsystem.component.GlassCard
import tv.bayit.plus.designsystem.component.GlassLoadingIndicator
import tv.bayit.plus.designsystem.component.GlassTopBar
import tv.bayit.plus.designsystem.theme.DesignTokens
import tv.bayit.plus.designsystem.i18n.bayitString

@Composable
fun BillingRoute(
    onNavigateBack: () -> Unit,
    modifier: Modifier = Modifier,
    viewModel: BillingViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    BillingScreen(
        uiState = uiState,
        onNavigateBack = onNavigateBack,
        onRetry = viewModel::retry,
        modifier = modifier,
    )
}

@Composable
internal fun BillingScreen(
    uiState: BillingUiState,
    onNavigateBack: () -> Unit,
    onRetry: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(modifier = modifier.fillMaxSize()) {
        GlassTopBar(
            title = bayitString("settings.billing.title"),
            navigationIcon = {
                IconButton(onClick = onNavigateBack) {
                    Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = bayitString("common.back"), tint = DesignTokens.Colors.Text.primary)
                }
            },
        )
        when (uiState) {
            is BillingUiState.Loading -> GlassLoadingIndicator()
            is BillingUiState.Error -> BillingErrorContent(message = uiState.message, onRetry = onRetry)
            is BillingUiState.Success -> BillingContent(email = uiState.email, createdAt = uiState.createdAt)
        }
    }
}

@Composable
private fun BillingContent(email: String, createdAt: String) {
    LazyColumn(
        modifier = Modifier.fillMaxSize().padding(horizontal = DesignTokens.Spacing.base),
        verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm),
    ) {
        item { Spacer(Modifier.height(DesignTokens.Spacing.base)) }
        item {
            GlassCard(modifier = Modifier.fillMaxWidth()) {
                Column {
                    Text(text = bayitString("settings.billing.accountEmail"), color = DesignTokens.Colors.Text.muted, style = MaterialTheme.typography.bodySmall)
                    Text(text = email, color = DesignTokens.Colors.Text.primary, style = MaterialTheme.typography.bodyLarge)
                }
            }
        }
        item {
            GlassCard(modifier = Modifier.fillMaxWidth()) {
                Column {
                    Text(text = bayitString("settings.billing.memberSince"), color = DesignTokens.Colors.Text.muted, style = MaterialTheme.typography.bodySmall)
                    Text(text = createdAt, color = DesignTokens.Colors.Text.primary, style = MaterialTheme.typography.bodyLarge)
                }
            }
        }
        item {
            GlassCard(modifier = Modifier.fillMaxWidth()) {
                Column {
                    Text(
                        text = bayitString("settings.billing.paymentHistory"),
                        color = DesignTokens.Colors.Text.primary,
                        style = MaterialTheme.typography.titleMedium,
                    )
                    Spacer(Modifier.height(DesignTokens.Spacing.sm))
                    Text(
                        text = bayitString("settings.billing.paymentHistoryDescription"),
                        color = DesignTokens.Colors.Text.secondary,
                        style = MaterialTheme.typography.bodyMedium,
                    )
                }
            }
        }
        item { Spacer(Modifier.height(DesignTokens.Spacing.xxl)) }
    }
}

@Composable
private fun BillingErrorContent(message: String, onRetry: () -> Unit) {
    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md)) {
            Text(text = message, style = MaterialTheme.typography.bodyLarge, color = DesignTokens.Colors.Semantic.error)
            GlassButton(text = bayitString("common.retry"), onClick = onRetry)
        }
    }
}

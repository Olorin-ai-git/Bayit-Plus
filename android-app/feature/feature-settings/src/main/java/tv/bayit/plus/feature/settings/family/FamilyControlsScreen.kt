package tv.bayit.plus.feature.settings.family

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
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
import tv.bayit.plus.designsystem.component.GlassBadge
import tv.bayit.plus.designsystem.component.GlassButton
import tv.bayit.plus.designsystem.component.GlassCard
import tv.bayit.plus.designsystem.component.GlassLoadingIndicator
import tv.bayit.plus.designsystem.component.GlassTopBar
import tv.bayit.plus.designsystem.theme.DesignTokens

@Composable
fun FamilyControlsRoute(
    onNavigateBack: () -> Unit,
    modifier: Modifier = Modifier,
    viewModel: FamilyControlsViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    FamilyControlsScreen(
        uiState = uiState,
        onNavigateBack = onNavigateBack,
        onRetry = viewModel::retry,
        modifier = modifier,
    )
}

@Composable
internal fun FamilyControlsScreen(
    uiState: FamilyControlsUiState,
    onNavigateBack: () -> Unit,
    onRetry: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(modifier = modifier.fillMaxSize()) {
        GlassTopBar(
            title = "Family Controls",
            navigationIcon = {
                IconButton(onClick = onNavigateBack) {
                    Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back", tint = DesignTokens.Colors.Text.primary)
                }
            },
        )
        when (uiState) {
            is FamilyControlsUiState.Loading -> GlassLoadingIndicator()
            is FamilyControlsUiState.Error -> FamilyErrorContent(message = uiState.message, onRetry = onRetry)
            is FamilyControlsUiState.Success -> FamilyContent(state = uiState)
        }
    }
}

@Composable
private fun FamilyContent(state: FamilyControlsUiState.Success) {
    LazyColumn(
        modifier = Modifier.fillMaxSize().padding(horizontal = DesignTokens.Spacing.base),
        verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm),
    ) {
        item { Spacer(Modifier.height(DesignTokens.Spacing.base)) }
        item {
            Text(
                text = "Profile Restrictions",
                color = DesignTokens.Colors.Text.primary,
                style = MaterialTheme.typography.titleMedium,
            )
        }
        if (state.profiles.isEmpty()) {
            item {
                GlassCard(modifier = Modifier.fillMaxWidth()) {
                    Text(
                        text = "No family profiles configured. Set up content restrictions to protect younger viewers.",
                        color = DesignTokens.Colors.Text.secondary,
                        style = MaterialTheme.typography.bodyMedium,
                    )
                }
            }
        } else {
            items(items = state.profiles, key = { it.hashCode() }) { profile ->
                GlassCard(modifier = Modifier.fillMaxWidth()) {
                    Column {
                        Text(text = profile.toString(), color = DesignTokens.Colors.Text.primary, style = MaterialTheme.typography.bodyLarge)
                    }
                }
            }
        }
        item {
            Spacer(Modifier.height(DesignTokens.Spacing.md))
            Text(text = "Screen Time", color = DesignTokens.Colors.Text.primary, style = MaterialTheme.typography.titleMedium)
        }
        item {
            GlassCard(modifier = Modifier.fillMaxWidth()) {
                Column {
                    if (state.screenTimeInfo.isNotEmpty()) {
                        Text(text = state.screenTimeInfo, color = DesignTokens.Colors.Text.secondary, style = MaterialTheme.typography.bodyMedium)
                    } else {
                        Text(
                            text = "No screen time rules configured. Set viewing hour limits to manage content access.",
                            color = DesignTokens.Colors.Text.secondary,
                            style = MaterialTheme.typography.bodyMedium,
                        )
                    }
                }
            }
        }
        item { Spacer(Modifier.height(DesignTokens.Spacing.xxl)) }
    }
}

@Composable
private fun FamilyErrorContent(message: String, onRetry: () -> Unit) {
    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md)) {
            Text(text = message, style = MaterialTheme.typography.bodyLarge, color = DesignTokens.Colors.Semantic.error)
            GlassButton(text = "Retry", onClick = onRetry)
        }
    }
}

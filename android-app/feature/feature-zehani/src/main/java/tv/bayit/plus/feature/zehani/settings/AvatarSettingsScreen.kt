package tv.bayit.plus.feature.zehani.settings

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
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

@Composable
fun AvatarSettingsRoute(
    onNavigateBack: () -> Unit,
    modifier: Modifier = Modifier,
    viewModel: AvatarSettingsViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    AvatarSettingsScreen(
        uiState = uiState,
        onSelectOutfit = viewModel::selectOutfit,
        onTogglePrivacy = viewModel::togglePrivacy,
        onToggleAnimations = viewModel::toggleAnimations,
        onNavigateBack = onNavigateBack,
        onRetry = viewModel::retry,
        modifier = modifier,
    )
}

@Composable
internal fun AvatarSettingsScreen(
    uiState: AvatarSettingsUiState,
    onSelectOutfit: (String) -> Unit,
    onTogglePrivacy: (Boolean) -> Unit,
    onToggleAnimations: (Boolean) -> Unit,
    onNavigateBack: () -> Unit,
    onRetry: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(modifier = modifier.fillMaxSize()) {
        GlassTopBar(title = "Avatar Settings")
        when (uiState) {
            is AvatarSettingsUiState.Loading -> GlassLoadingIndicator()
            is AvatarSettingsUiState.Error -> AvatarSettingsErrorContent(message = uiState.message, onRetry = onRetry)
            is AvatarSettingsUiState.Success -> AvatarSettingsContent(
                state = uiState,
                onSelectOutfit = onSelectOutfit,
                onTogglePrivacy = onTogglePrivacy,
                onToggleAnimations = onToggleAnimations,
            )
        }
    }
}

@Composable
private fun AvatarSettingsContent(
    state: AvatarSettingsUiState.Success,
    onSelectOutfit: (String) -> Unit,
    onTogglePrivacy: (Boolean) -> Unit,
    onToggleAnimations: (Boolean) -> Unit,
) {
    LazyColumn(
        modifier = Modifier.fillMaxSize().padding(horizontal = DesignTokens.Spacing.base),
        verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md),
    ) {
        item { Spacer(Modifier.height(DesignTokens.Spacing.sm)) }

        item {
            GlassCard(modifier = Modifier.fillMaxWidth()) {
                Column(verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md)) {
                    Text(
                        text = "Privacy",
                        style = MaterialTheme.typography.titleMedium,
                        color = DesignTokens.Colors.Text.primary,
                        fontWeight = FontWeight.SemiBold,
                    )
                    SettingToggle(
                        label = "Private Avatar Mode",
                        description = "Hide your avatar from other users",
                        checked = state.privacyEnabled,
                        onCheckedChange = onTogglePrivacy,
                    )
                }
            }
        }

        item {
            GlassCard(modifier = Modifier.fillMaxWidth()) {
                Column(verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md)) {
                    Text(
                        text = "Appearance",
                        style = MaterialTheme.typography.titleMedium,
                        color = DesignTokens.Colors.Text.primary,
                        fontWeight = FontWeight.SemiBold,
                    )
                    SettingToggle(
                        label = "Enable Animations",
                        description = "Animate avatar movements and expressions",
                        checked = state.animationsEnabled,
                        onCheckedChange = onToggleAnimations,
                    )
                }
            }
        }

        item {
            Text(
                text = "Available Outfits",
                style = MaterialTheme.typography.titleLarge,
                color = DesignTokens.Colors.Text.primary,
                fontWeight = FontWeight.Bold,
            )
        }

        items(state.availableOutfits, key = { it.hashCode() }) { outfit ->
            val outfitId = outfit.hashCode().toString()
            val isSelected = outfitId == state.selectedOutfitId

            GlassCard(
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable { onSelectOutfit(outfitId) },
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = outfit.toString(),
                            style = MaterialTheme.typography.bodyMedium,
                            color = if (isSelected) DesignTokens.Colors.Primary.light else DesignTokens.Colors.Text.primary,
                            fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal,
                        )
                    }
                    if (isSelected) {
                        Text(
                            text = "✓",
                            color = DesignTokens.Colors.Primary.light,
                            fontSize = DesignTokens.FontSize.lg,
                            fontWeight = FontWeight.Bold,
                        )
                    }
                }
            }
        }

        item { Spacer(Modifier.height(DesignTokens.Spacing.xxl)) }
    }
}

// SettingToggle and AvatarSettingsErrorContent are in AvatarSettingsScreen+Components.kt

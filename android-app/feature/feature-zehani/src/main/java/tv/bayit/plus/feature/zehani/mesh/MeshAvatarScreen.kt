package tv.bayit.plus.feature.zehani.mesh

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
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
import androidx.compose.ui.text.font.FontWeight
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import tv.bayit.plus.designsystem.component.GlassButton
import tv.bayit.plus.designsystem.component.GlassCard
import tv.bayit.plus.designsystem.component.GlassChip
import tv.bayit.plus.designsystem.component.GlassLoadingIndicator
import tv.bayit.plus.designsystem.component.GlassTopBar
import tv.bayit.plus.designsystem.theme.DesignTokens
import tv.bayit.plus.designsystem.i18n.bayitString

@Composable
fun MeshAvatarRoute(
    onNavigateBack: () -> Unit,
    modifier: Modifier = Modifier,
    viewModel: MeshAvatarViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    MeshAvatarScreen(
        uiState = uiState,
        onUpdateSkinTone = viewModel::updateSkinTone,
        onUpdateHairStyle = viewModel::updateHairStyle,
        onToggleAccessory = viewModel::toggleAccessory,
        onSave = viewModel::save,
        onNavigateBack = onNavigateBack,
        onRetry = viewModel::retry,
        modifier = modifier,
    )
}

@Composable
internal fun MeshAvatarScreen(
    uiState: MeshAvatarUiState,
    onUpdateSkinTone: (String) -> Unit,
    onUpdateHairStyle: (String) -> Unit,
    onToggleAccessory: (String) -> Unit,
    onSave: () -> Unit,
    onNavigateBack: () -> Unit,
    onRetry: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(modifier = modifier.fillMaxSize()) {
        GlassTopBar(
            title = bayitString("zehAni.mesh.title"),
            navigationIcon = {
                IconButton(onClick = onNavigateBack) {
                    Icon(
                        Icons.AutoMirrored.Filled.ArrowBack,
                        contentDescription = bayitString("common.back"),
                        tint = DesignTokens.Colors.Text.primary,
                    )
                }
            },
        )
        when (uiState) {
            is MeshAvatarUiState.Loading -> GlassLoadingIndicator()
            is MeshAvatarUiState.Success -> MeshAvatarContent(
                meshUrl = uiState.meshUrl,
                skinTone = uiState.skinTone,
                hairStyle = uiState.hairStyle,
                accessories = uiState.accessories,
                onUpdateSkinTone = onUpdateSkinTone,
                onUpdateHairStyle = onUpdateHairStyle,
                onToggleAccessory = onToggleAccessory,
                onSave = onSave,
            )
            is MeshAvatarUiState.Error -> MeshAvatarError(uiState.message, onRetry)
        }
    }
}

@Composable
private fun MeshAvatarContent(
    meshUrl: String?,
    skinTone: String,
    hairStyle: String,
    accessories: List<String>,
    onUpdateSkinTone: (String) -> Unit,
    onUpdateHairStyle: (String) -> Unit,
    onToggleAccessory: (String) -> Unit,
    onSave: () -> Unit,
) {
    LazyColumn(
        modifier = Modifier.fillMaxSize().padding(DesignTokens.Spacing.base),
        verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md),
    ) {
        item {
            GlassCard(modifier = Modifier.fillMaxWidth()) {
                Column(verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm)) {
                    Text(
                        text = bayitString("zehAni.mesh.meshViewer"),
                        style = MaterialTheme.typography.titleSmall,
                        color = DesignTokens.Colors.Text.primary,
                        fontWeight = FontWeight.SemiBold,
                    )
                    Box(modifier = Modifier.fillMaxWidth().aspectRatio(1f), contentAlignment = Alignment.Center) {
                        Text(
                            text = bayitString("zehAni.mesh.meshViewerDescription"),
                            style = MaterialTheme.typography.bodyMedium,
                            color = DesignTokens.Colors.Text.muted,
                        )
                    }
                }
            }
        }
        item {
            Text(text = bayitString("zehAni.mesh.skinTone"), style = MaterialTheme.typography.titleSmall,
                color = DesignTokens.Colors.Text.primary, fontWeight = FontWeight.SemiBold)
        }
        item {
            LazyRow(horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm)) {
                items(items = SKIN_TONES, key = { it }) { tone ->
                    GlassChip(label = tone, isSelected = tone == skinTone, onClick = { onUpdateSkinTone(tone) })
                }
            }
        }
        item {
            Spacer(modifier = Modifier.height(DesignTokens.Spacing.xs))
            Text(text = bayitString("zehAni.mesh.hairStyle"), style = MaterialTheme.typography.titleSmall,
                color = DesignTokens.Colors.Text.primary, fontWeight = FontWeight.SemiBold)
        }
        item {
            LazyRow(horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm)) {
                items(items = HAIR_STYLES, key = { it }) { style ->
                    GlassChip(label = style, isSelected = style == hairStyle, onClick = { onUpdateHairStyle(style) })
                }
            }
        }
        item {
            Spacer(modifier = Modifier.height(DesignTokens.Spacing.xs))
            Text(text = bayitString("zehAni.mesh.accessories"), style = MaterialTheme.typography.titleSmall,
                color = DesignTokens.Colors.Text.primary, fontWeight = FontWeight.SemiBold)
        }
        item {
            Column(verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm)) {
                AVAILABLE_ACCESSORIES.forEach { accessory ->
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically) {
                        Text(text = accessory, style = MaterialTheme.typography.bodyMedium,
                            color = DesignTokens.Colors.Text.primary)
                        GlassChip(label = if (accessories.contains(accessory)) bayitString("common.enabled") else bayitString("common.disabled"),
                            isSelected = accessories.contains(accessory), onClick = { onToggleAccessory(accessory) })
                    }
                }
            }
        }
        item {
            Spacer(modifier = Modifier.height(DesignTokens.Spacing.md))
            GlassButton(text = bayitString("zehAni.mesh.saveChanges"), onClick = onSave, modifier = Modifier.fillMaxWidth())
        }
    }
}

@Composable
private fun MeshAvatarError(message: String, onRetry: () -> Unit) {
    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md),
        ) {
            Text(text = message, style = MaterialTheme.typography.bodyLarge, color = DesignTokens.Colors.Semantic.error)
            GlassButton(text = bayitString("common.retry"), onClick = onRetry)
        }
    }
}

package tv.bayit.plus.feature.zehani.wardrobe

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import tv.bayit.plus.designsystem.component.CachedAsyncImage
import tv.bayit.plus.designsystem.component.GlassButton
import tv.bayit.plus.designsystem.component.GlassCard
import tv.bayit.plus.designsystem.component.GlassLoadingIndicator
import tv.bayit.plus.designsystem.component.GlassTopBar
import tv.bayit.plus.designsystem.theme.DesignTokens
import tv.bayit.plus.designsystem.i18n.bayitString

private const val GRID_COLUMNS = 2

@Composable
fun AvatarWardrobeRoute(
    onNavigateBack: () -> Unit,
    modifier: Modifier = Modifier,
    viewModel: AvatarWardrobeViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    AvatarWardrobeScreen(
        uiState = uiState,
        onEquipOutfit = viewModel::equipOutfit,
        onNavigateBack = onNavigateBack,
        onRetry = viewModel::retry,
        modifier = modifier,
    )
}

@Composable
internal fun AvatarWardrobeScreen(
    uiState: AvatarWardrobeUiState,
    onEquipOutfit: (String) -> Unit,
    onNavigateBack: () -> Unit,
    onRetry: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(modifier = modifier.fillMaxSize()) {
        GlassTopBar(
            title = bayitString("zehAni.wardrobe.title"),
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
            is AvatarWardrobeUiState.Loading -> GlassLoadingIndicator()
            is AvatarWardrobeUiState.Success -> WardrobeContent(
                outfits = uiState.outfits,
                equippedId = uiState.equippedId,
                onEquipOutfit = onEquipOutfit,
            )
            is AvatarWardrobeUiState.Error -> WardrobeError(
                message = uiState.message,
                onRetry = onRetry,
            )
        }
    }
}

@Composable
private fun WardrobeContent(
    outfits: List<AvatarOutfit>,
    equippedId: String?,
    onEquipOutfit: (String) -> Unit,
) {
    LazyVerticalGrid(
        columns = GridCells.Fixed(GRID_COLUMNS),
        contentPadding = PaddingValues(DesignTokens.Spacing.base),
        verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md),
        horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md),
        modifier = Modifier.fillMaxSize(),
    ) {
        items(items = outfits, key = { it.id }) { outfit ->
            OutfitCard(
                outfit = outfit,
                isEquipped = outfit.id == equippedId,
                onClick = { onEquipOutfit(outfit.id) },
            )
        }
    }
}

@Composable
private fun OutfitCard(
    outfit: AvatarOutfit,
    isEquipped: Boolean,
    onClick: () -> Unit,
) {
    GlassCard(modifier = Modifier.fillMaxWidth().clickable(onClick = onClick)) {
        Column(verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm)) {
            Box(modifier = Modifier.fillMaxWidth().aspectRatio(1f)) {
                if (outfit.thumbnailUrl != null) {
                    CachedAsyncImage(
                        url = outfit.thumbnailUrl,
                        contentDescription = outfit.name,
                        modifier = Modifier.fillMaxSize(),
                        contentScale = ContentScale.Crop,
                    )
                } else {
                    Box(
                        modifier = Modifier.fillMaxSize(),
                        contentAlignment = Alignment.Center,
                    ) {
                        Text(
                            text = outfit.name,
                            style = MaterialTheme.typography.bodyMedium,
                            color = DesignTokens.Colors.Text.muted,
                        )
                    }
                }
                if (isEquipped) {
                    Icon(
                        Icons.Default.CheckCircle,
                        contentDescription = bayitString("zehAni.wardrobe.equippedContentDescription"),
                        tint = DesignTokens.Colors.Primary.base,
                        modifier = Modifier
                            .align(Alignment.TopEnd)
                            .padding(DesignTokens.Spacing.xs),
                    )
                }
            }
            Text(
                text = outfit.name,
                style = MaterialTheme.typography.bodyMedium,
                color = DesignTokens.Colors.Text.primary,
                fontWeight = if (isEquipped) FontWeight.SemiBold else FontWeight.Normal,
            )
        }
    }
}

@Composable
private fun WardrobeError(message: String, onRetry: () -> Unit) {
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
            GlassButton(text = bayitString("common.retry"), onClick = onRetry)
        }
    }
}

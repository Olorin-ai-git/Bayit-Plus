package tv.bayit.plus.feature.byoc

import androidx.compose.foundation.Image
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
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import tv.bayit.plus.core.byoc.models.BYOCSourceConfig
import tv.bayit.plus.core.byoc.models.BYOCSourceType
import tv.bayit.plus.designsystem.component.GlassButton
import tv.bayit.plus.designsystem.component.GlassCard
import tv.bayit.plus.designsystem.component.GlassLoadingIndicator
import tv.bayit.plus.designsystem.component.GlassTopBar
import tv.bayit.plus.designsystem.icons.BayitIcons
import tv.bayit.plus.designsystem.theme.DesignTokens

@Composable
fun BYOCSettingsRoute(
    onNavigateBack: () -> Unit,
    onAddPlex: () -> Unit,
    onAddYouTube: () -> Unit,
    onAddSource: () -> Unit,
    modifier: Modifier = Modifier,
    viewModel: BYOCSettingsViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    BYOCSettingsScreen(
        uiState = uiState,
        onNavigateBack = onNavigateBack,
        onAddPlex = onAddPlex,
        onAddYouTube = onAddYouTube,
        onAddSource = onAddSource,
        onRemoveSource = viewModel::removeSource,
        onRefresh = viewModel::refreshAll,
        modifier = modifier,
    )
}

@Composable
internal fun BYOCSettingsScreen(
    uiState: BYOCSettingsUiState,
    onNavigateBack: () -> Unit,
    onAddPlex: () -> Unit,
    onAddYouTube: () -> Unit,
    onAddSource: () -> Unit,
    onRemoveSource: (String) -> Unit,
    onRefresh: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(modifier = modifier.fillMaxSize()) {
        GlassTopBar(
            title = "Your Content Sources",
            navigationIcon = {
                IconButton(onClick = onNavigateBack) {
                    Icon(
                        Icons.AutoMirrored.Filled.ArrowBack,
                        contentDescription = "Back",
                        tint = DesignTokens.Colors.Text.primary,
                    )
                }
            },
            actions = {
                IconButton(onClick = onRefresh) {
                    Icon(
                        Icons.Default.Refresh,
                        contentDescription = "Refresh",
                        tint = DesignTokens.Colors.Text.primary,
                    )
                }
            },
        )
        when (uiState) {
            is BYOCSettingsUiState.Loading -> GlassLoadingIndicator()
            is BYOCSettingsUiState.Ready -> SourcesContent(
                sources = uiState.sources,
                onAddPlex = onAddPlex,
                onAddYouTube = onAddYouTube,
                onAddSource = onAddSource,
                onRemoveSource = onRemoveSource,
            )
        }
    }
}

@Composable
private fun SourcesContent(
    sources: List<BYOCSourceConfig>,
    onAddPlex: () -> Unit,
    onAddYouTube: () -> Unit,
    onAddSource: () -> Unit,
    onRemoveSource: (String) -> Unit,
) {
    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(DesignTokens.Spacing.lg),
        verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md),
    ) {
        if (sources.isEmpty()) {
            item {
                Column(
                    Modifier.fillMaxWidth(),
                    horizontalAlignment = Alignment.CenterHorizontally,
                ) {
                    Text(
                        "No content sources connected",
                        style = MaterialTheme.typography.bodyLarge,
                        color = DesignTokens.Colors.Text.secondary,
                    )
                    Spacer(modifier = Modifier.height(DesignTokens.Spacing.sm))
                    Text(
                        "Connect your Plex, YouTube, IPTV, or Xtream provider",
                        style = MaterialTheme.typography.bodyMedium,
                        color = DesignTokens.Colors.Text.secondary,
                    )
                    Spacer(modifier = Modifier.height(DesignTokens.Spacing.xl))
                }
            }
        }
        items(sources, key = { it.id }) { source ->
            SourceCard(source = source, onRemove = { onRemoveSource(source.id) })
        }
        item {
            Spacer(modifier = Modifier.height(DesignTokens.Spacing.sm))
            AddSourceButtons(
                onAddPlex = onAddPlex,
                onAddYouTube = onAddYouTube,
                onAddSource = onAddSource,
            )
        }
    }
}

@Composable
private fun SourceCard(source: BYOCSourceConfig, onRemove: () -> Unit) {
    GlassCard(modifier = Modifier.fillMaxWidth()) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(DesignTokens.Spacing.md),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md),
        ) {
            ProviderLogo(
                sourceType = source.type,
                modifier = Modifier.height(28.dp),
            )
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = source.name,
                    style = MaterialTheme.typography.titleMedium,
                    color = DesignTokens.Colors.Text.primary,
                )
                Text(
                    text = source.status.name.lowercase()
                        .replaceFirstChar { it.uppercase() },
                    style = MaterialTheme.typography.labelSmall,
                    color = when (source.status.name) {
                        "ACTIVE" -> DesignTokens.Colors.Primary.light
                        "ERROR" -> DesignTokens.Colors.Semantic.error
                        else -> DesignTokens.Colors.Text.secondary
                    },
                )
            }
            IconButton(onClick = onRemove) {
                Icon(
                    Icons.Default.Delete,
                    contentDescription = "Remove source",
                    tint = DesignTokens.Colors.Semantic.error,
                )
            }
        }
    }
}

@Composable
private fun ProviderLogo(sourceType: BYOCSourceType, modifier: Modifier = Modifier) {
    when (sourceType) {
        BYOCSourceType.PLEX -> Image(
            painter = painterResource(R.drawable.ic_plex_logo),
            contentDescription = "Plex",
            modifier = modifier,
            contentScale = ContentScale.FillHeight,
        )
        BYOCSourceType.YOUTUBE -> Image(
            painter = painterResource(R.drawable.ic_youtube_logo),
            contentDescription = "YouTube",
            modifier = modifier,
            contentScale = ContentScale.FillHeight,
        )
        BYOCSourceType.XTREAM -> Icon(
            imageVector = BayitIcons.Xtream,
            contentDescription = "Xtream Codes",
            modifier = Modifier.size(28.dp),
            tint = DesignTokens.Colors.Text.primary,
        )
        BYOCSourceType.IPTV -> Icon(
            imageVector = BayitIcons.Iptv,
            contentDescription = "IPTV",
            modifier = Modifier.size(28.dp),
            tint = DesignTokens.Colors.Text.primary,
        )
    }
}

@Composable
private fun AddSourceButtons(
    onAddPlex: () -> Unit,
    onAddYouTube: () -> Unit,
    onAddSource: () -> Unit,
) {
    Column(verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md)) {
        ProviderConnectCard(
            onClick = onAddPlex,
            logo = {
                Image(
                    painter = painterResource(R.drawable.ic_plex_logo),
                    contentDescription = "Plex",
                    modifier = Modifier.height(24.dp),
                    contentScale = ContentScale.FillHeight,
                )
            },
            subtitle = "Stream from your Plex media server",
        )
        ProviderConnectCard(
            onClick = onAddYouTube,
            logo = {
                Image(
                    painter = painterResource(R.drawable.ic_youtube_logo),
                    contentDescription = "YouTube",
                    modifier = Modifier.height(20.dp),
                    contentScale = ContentScale.FillHeight,
                )
            },
            subtitle = "Access your YouTube library",
        )
        ProviderConnectCard(
            onClick = onAddSource,
            logo = {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        imageVector = BayitIcons.Xtream,
                        contentDescription = null,
                        modifier = Modifier.size(24.dp),
                        tint = DesignTokens.Colors.Text.primary,
                    )
                    Spacer(modifier = Modifier.width(DesignTokens.Spacing.sm))
                    Text(
                        text = "IPTV / Xtream",
                        style = MaterialTheme.typography.titleMedium,
                        color = DesignTokens.Colors.Text.primary,
                    )
                }
            },
            subtitle = "Add M3U playlist or Xtream Codes",
        )
    }
}

@Composable
private fun ProviderConnectCard(
    onClick: () -> Unit,
    logo: @Composable () -> Unit,
    subtitle: String,
) {
    GlassCard(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(
                    horizontal = DesignTokens.Spacing.lg,
                    vertical = DesignTokens.Spacing.md,
                ),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Box(modifier = Modifier.padding(bottom = DesignTokens.Spacing.xs)) {
                    logo()
                }
                Text(
                    text = subtitle,
                    style = MaterialTheme.typography.bodySmall,
                    color = DesignTokens.Colors.Text.secondary,
                )
            }
            Icon(
                imageVector = Icons.Default.ChevronRight,
                contentDescription = null,
                tint = DesignTokens.Colors.Text.secondary,
            )
        }
    }
}

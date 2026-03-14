package tv.bayit.plus.feature.settings.downloads

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.foundation.clickable
import androidx.hilt.navigation.compose.hiltViewModel
import tv.bayit.plus.core.data.download.DownloadQuality
import tv.bayit.plus.designsystem.component.GlassCard
import tv.bayit.plus.designsystem.component.GlassTopBar
import tv.bayit.plus.designsystem.i18n.bayitString
import tv.bayit.plus.designsystem.theme.DesignTokens

@Composable
fun DownloadSettingsRoute(
    onNavigateBack: () -> Unit,
    modifier: Modifier = Modifier,
    viewModel: DownloadSettingsViewModel = hiltViewModel(),
) {
    DownloadSettingsScreen(
        selectedQuality = viewModel.quality,
        wifiOnly = viewModel.wifiOnly,
        usedStorageMb = viewModel.usedStorageMb,
        availableStorageMb = viewModel.availableStorageMb,
        onQualitySelected = viewModel::updateQuality,
        onWifiOnlyChanged = viewModel::updateWifiOnly,
        onNavigateBack = onNavigateBack,
        modifier = modifier,
    )
}

@Composable
private fun DownloadSettingsScreen(
    selectedQuality: DownloadQuality,
    wifiOnly: Boolean,
    usedStorageMb: Long,
    availableStorageMb: Long,
    onQualitySelected: (DownloadQuality) -> Unit,
    onWifiOnlyChanged: (Boolean) -> Unit,
    onNavigateBack: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(modifier = modifier.fillMaxSize()) {
        GlassTopBar(
            title = bayitString("settings.downloads.title"),
            navigationIcon = {
                IconButton(onClick = onNavigateBack) {
                    Icon(
                        Icons.AutoMirrored.Filled.ArrowBack,
                        bayitString("common.back"),
                        tint = DesignTokens.Colors.Text.primary,
                    )
                }
            },
        )
        Column(
            modifier = Modifier.padding(DesignTokens.Spacing.base),
            verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md),
        ) {
            QualitySection(selectedQuality, onQualitySelected)
            WifiOnlySection(wifiOnly, onWifiOnlyChanged)
            StorageSection(usedStorageMb, availableStorageMb)
        }
    }
}

@Composable
private fun QualitySection(
    selectedQuality: DownloadQuality,
    onQualitySelected: (DownloadQuality) -> Unit,
) {
    Text(
        text = bayitString("settings.downloads.quality"),
        style = MaterialTheme.typography.titleSmall,
        color = DesignTokens.Colors.Text.primary,
    )
    DownloadQuality.entries.forEach { quality ->
        val (labelKey, hintKey) = qualityKeys(quality)
        QualityRow(
            label = bayitString(labelKey),
            hint = bayitString(hintKey),
            isSelected = quality == selectedQuality,
            onClick = { onQualitySelected(quality) },
        )
    }
}

@Composable
private fun QualityRow(
    label: String,
    hint: String,
    isSelected: Boolean,
    onClick: () -> Unit,
) {
    GlassCard(
        modifier = Modifier.fillMaxWidth().clickable(onClick = onClick),
    ) {
        Row(
            modifier = Modifier.padding(DesignTokens.Spacing.base),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column(Modifier.weight(1f)) {
                Text(label, style = MaterialTheme.typography.bodyLarge, color = DesignTokens.Colors.Text.primary)
                Text(hint, style = MaterialTheme.typography.bodySmall, color = DesignTokens.Colors.Text.secondary)
            }
            if (isSelected) {
                Text(
                    text = bayitString("common.selected"),
                    style = MaterialTheme.typography.labelMedium,
                    color = DesignTokens.Colors.Primary.base,
                )
            }
        }
    }
}

@Composable
private fun WifiOnlySection(wifiOnly: Boolean, onWifiOnlyChanged: (Boolean) -> Unit) {
    GlassCard(modifier = Modifier.fillMaxWidth()) {
        Row(
            modifier = Modifier.padding(DesignTokens.Spacing.base),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column(Modifier.weight(1f)) {
                Text(
                    bayitString("settings.downloads.wifiOnly"),
                    style = MaterialTheme.typography.bodyLarge,
                    color = DesignTokens.Colors.Text.primary,
                )
                Text(
                    bayitString("settings.downloads.wifiOnlyHint"),
                    style = MaterialTheme.typography.bodySmall,
                    color = DesignTokens.Colors.Text.secondary,
                )
            }
            Switch(checked = wifiOnly, onCheckedChange = onWifiOnlyChanged)
        }
    }
}

@Composable
private fun StorageSection(usedMb: Long, availableMb: Long) {
    Text(
        text = bayitString("downloads.storage"),
        style = MaterialTheme.typography.titleSmall,
        color = DesignTokens.Colors.Text.primary,
    )
    GlassCard(modifier = Modifier.fillMaxWidth()) {
        Column(modifier = Modifier.padding(DesignTokens.Spacing.base)) {
            Text(
                bayitString("downloads.storageUsed"),
                style = MaterialTheme.typography.bodySmall,
                color = DesignTokens.Colors.Text.secondary,
            )
            Spacer(Modifier.height(DesignTokens.Spacing.xs))
            Text(
                "$usedMb MB / $availableMb MB",
                style = MaterialTheme.typography.bodyLarge,
                color = DesignTokens.Colors.Text.primary,
            )
        }
    }
}

private fun qualityKeys(quality: DownloadQuality): Pair<String, String> = when (quality) {
    DownloadQuality.SD -> "settings.downloads.qualitySd" to "settings.downloads.sizeHintSd"
    DownloadQuality.HD -> "settings.downloads.qualityHd" to "settings.downloads.sizeHintHd"
    DownloadQuality.FHD -> "settings.downloads.qualityFhd" to "settings.downloads.sizeHintFhd"
}

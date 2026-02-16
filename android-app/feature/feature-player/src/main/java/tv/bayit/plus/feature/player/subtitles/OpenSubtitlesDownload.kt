package tv.bayit.plus.feature.player.subtitles

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import tv.bayit.plus.core.model.ImportedTrack
import tv.bayit.plus.designsystem.component.GlassButton
import tv.bayit.plus.designsystem.component.GlassCard
import tv.bayit.plus.designsystem.component.GlassLoadingIndicator
import tv.bayit.plus.designsystem.i18n.bayitString
import tv.bayit.plus.designsystem.theme.DesignTokens

/**
 * UI for browsing and downloading external subtitle tracks from OpenSubtitles.
 *
 * Shows a list of available tracks with metadata (rating, download count,
 * hearing impaired indicator) and a download button for each track.
 */
@Composable
fun OpenSubtitlesDownload(
    tracks: List<ImportedTrack>,
    isLoading: Boolean,
    onFetchExternal: () -> Unit,
    onTrackSelected: (ImportedTrack) -> Unit,
    onDismiss: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier = modifier
            .fillMaxWidth()
            .padding(DesignTokens.Spacing.base),
    ) {
        Text(
            text = bayitString("subtitles.opensubtitles"),
            color = DesignTokens.Colors.Text.primary,
            fontSize = DesignTokens.FontSize.lg,
            fontWeight = FontWeight.Bold,
        )

        Spacer(modifier = Modifier.height(DesignTokens.Spacing.md))

        if (isLoading) {
            GlassLoadingIndicator()
        } else if (tracks.isEmpty()) {
            Column(
                modifier = Modifier.fillMaxWidth(),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                Text(
                    text = bayitString("subtitles.searchExternal"),
                    color = DesignTokens.Colors.Text.secondary,
                    fontSize = DesignTokens.FontSize.base,
                )
                Spacer(modifier = Modifier.height(DesignTokens.Spacing.md))
                GlassButton(text = bayitString("subtitles.fetchSubtitles"), onClick = onFetchExternal)
            }
        } else {
            LazyColumn(
                verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.xs),
            ) {
                items(tracks, key = { it.id }) { track ->
                    ExternalTrackRow(
                        track = track,
                        onClick = { onTrackSelected(track) },
                    )
                }
            }
        }
    }
}

@Composable
private fun ExternalTrackRow(
    track: ImportedTrack,
    onClick: () -> Unit,
) {
    GlassCard(modifier = Modifier.fillMaxWidth().clickable(onClick = onClick)) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween,
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = track.languageName ?: track.language,
                    color = DesignTokens.Colors.Text.primary,
                    fontSize = DesignTokens.FontSize.base,
                    fontWeight = FontWeight.Medium,
                )
                Row(horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md)) {
                    track.rating?.let { rating ->
                        Text(
                            text = "Rating: ${"%.1f".format(rating)}",
                            color = DesignTokens.Colors.Text.secondary,
                            fontSize = DesignTokens.FontSize.xs,
                        )
                    }
                    track.downloadCount?.let { count ->
                        Text(
                            text = "Downloads: $count",
                            color = DesignTokens.Colors.Text.secondary,
                            fontSize = DesignTokens.FontSize.xs,
                        )
                    }
                }
            }

            if (track.hearingImpaired == true) {
                Text(
                    text = "HI",
                    color = DesignTokens.Colors.Semantic.info,
                    fontSize = DesignTokens.FontSize.xs,
                    fontWeight = FontWeight.Bold,
                )
            }
        }
    }
}

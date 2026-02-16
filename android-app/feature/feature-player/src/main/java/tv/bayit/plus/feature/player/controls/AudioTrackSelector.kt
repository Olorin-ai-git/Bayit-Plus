package tv.bayit.plus.feature.player.controls

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import tv.bayit.plus.core.model.AudioTrack
import tv.bayit.plus.designsystem.component.GlassCard
import tv.bayit.plus.designsystem.i18n.bayitString
import tv.bayit.plus.designsystem.modifier.glassMorphism
import tv.bayit.plus.designsystem.theme.DesignTokens

/**
 * Audio track selection picker for multi-language audio streams.
 */
@Composable
fun AudioTrackSelector(
    selectedTrackId: String?,
    tracks: List<AudioTrack>,
    onTrackSelected: (AudioTrack) -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier = modifier
            .fillMaxWidth()
            .glassMorphism(
                cornerRadius = DesignTokens.Radius.md,
                backgroundColor = DesignTokens.Colors.Glass.bg,
            )
            .padding(DesignTokens.Spacing.md),
    ) {
        Text(
            text = bayitString("player.controls.audioTrack"),
            color = DesignTokens.Colors.Text.primary,
            fontSize = DesignTokens.FontSize.base,
            fontWeight = FontWeight.SemiBold,
        )

        Column(
            modifier = Modifier.padding(top = DesignTokens.Spacing.sm),
            verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.xs),
        ) {
            tracks.forEach { track ->
                GlassCard(
                    modifier = Modifier.fillMaxWidth().clickable { onTrackSelected(track) },
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween,
                    ) {
                        Column {
                            Text(
                                text = track.label,
                                color = DesignTokens.Colors.Text.primary,
                                fontSize = DesignTokens.FontSize.base,
                            )
                            track.language?.let { lang ->
                                Text(
                                    text = lang,
                                    color = DesignTokens.Colors.Text.secondary,
                                    fontSize = DesignTokens.FontSize.xs,
                                )
                            }
                        }
                        if (track.id == selectedTrackId) {
                            Icon(
                                imageVector = Icons.Default.Check,
                                contentDescription = bayitString("player.controls.selected"),
                                tint = DesignTokens.Colors.Semantic.success,
                                modifier = Modifier.padding(end = DesignTokens.Spacing.xs),
                            )
                        }
                    }
                }
            }
        }
    }
}

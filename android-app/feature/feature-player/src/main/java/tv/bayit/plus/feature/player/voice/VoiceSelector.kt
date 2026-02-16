package tv.bayit.plus.feature.player.voice

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
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import tv.bayit.plus.designsystem.component.GlassCard
import tv.bayit.plus.designsystem.i18n.bayitString
import tv.bayit.plus.designsystem.theme.DesignTokens

/**
 * Voice selection picker for dubbing voice personalization.
 */
@Composable
fun VoiceSelector(
    selectedVoiceId: String?,
    voices: List<VoiceInfo>,
    onVoiceSelected: (VoiceInfo) -> Unit,
    onPreviewVoice: (VoiceInfo) -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier = modifier
            .fillMaxWidth()
            .padding(DesignTokens.Spacing.base),
    ) {
        Text(
            text = bayitString("player.dubbing.voiceTitle"),
            color = DesignTokens.Colors.Text.primary,
            fontSize = DesignTokens.FontSize.lg,
            fontWeight = FontWeight.Bold,
        )

        Spacer(modifier = Modifier.height(DesignTokens.Spacing.md))

        LazyColumn(
            verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.xs),
        ) {
            items(voices, key = { it.id }) { voice ->
                VoiceRow(
                    voice = voice,
                    isSelected = voice.id == selectedVoiceId,
                    onSelect = { onVoiceSelected(voice) },
                    onPreview = { onPreviewVoice(voice) },
                )
            }
        }
    }
}

@Composable
private fun VoiceRow(
    voice: VoiceInfo,
    isSelected: Boolean,
    onSelect: () -> Unit,
    onPreview: () -> Unit,
) {
    GlassCard(modifier = Modifier.fillMaxWidth().clickable(onClick = onSelect)) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween,
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = voice.name,
                    color = DesignTokens.Colors.Text.primary,
                    fontSize = DesignTokens.FontSize.base,
                    fontWeight = FontWeight.Medium,
                )
                Text(
                    text = voice.language,
                    color = DesignTokens.Colors.Text.secondary,
                    fontSize = DesignTokens.FontSize.xs,
                )
            }
            IconButton(onClick = onPreview) {
                Icon(
                    imageVector = Icons.Default.PlayArrow,
                    contentDescription = bayitString("player.controls.preview"),
                    tint = DesignTokens.Colors.Text.secondary,
                    modifier = Modifier.height(20.dp),
                )
            }
            if (isSelected) {
                Icon(
                    imageVector = Icons.Default.Check,
                    contentDescription = bayitString("player.controls.selected"),
                    tint = DesignTokens.Colors.Semantic.success,
                    modifier = Modifier.height(20.dp),
                )
            }
        }
    }
}

data class VoiceInfo(
    val id: String,
    val name: String,
    val language: String,
    val gender: String? = null,
)

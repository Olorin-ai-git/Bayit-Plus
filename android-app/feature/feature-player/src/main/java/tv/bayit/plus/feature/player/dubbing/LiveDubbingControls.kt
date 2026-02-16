package tv.bayit.plus.feature.player.dubbing

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.VolumeUp
import androidx.compose.material3.Icon
import androidx.compose.material3.Slider
import androidx.compose.material3.SliderDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import tv.bayit.plus.core.model.SubtitleLanguages
import tv.bayit.plus.designsystem.component.GlassChip
import tv.bayit.plus.designsystem.modifier.glassMorphism
import tv.bayit.plus.designsystem.theme.DesignTokens

/**
 * Bottom sheet controls for live dubbing settings.
 *
 * Allows adjusting dubbing volume, selecting target language,
 * and choosing a voice for the dubbing track.
 */
@Composable
fun LiveDubbingControls(
    targetLanguage: String,
    volume: Float,
    voiceId: String?,
    availableLanguages: List<String>,
    availableVoices: List<VoiceOption>,
    onLanguageSelected: (String) -> Unit,
    onVolumeChanged: (Float) -> Unit,
    onVoiceSelected: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier = modifier
            .fillMaxWidth()
            .glassMorphism(
                cornerRadius = DesignTokens.Radius.lg,
                backgroundColor = DesignTokens.Colors.Glass.bg,
            )
            .padding(DesignTokens.Spacing.base),
    ) {
        Text(
            text = "Live Dubbing Settings",
            color = DesignTokens.Colors.Text.primary,
            fontSize = DesignTokens.FontSize.lg,
            fontWeight = FontWeight.Bold,
        )

        Spacer(modifier = Modifier.height(DesignTokens.Spacing.md))

        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm),
        ) {
            Icon(
                imageVector = Icons.Default.VolumeUp,
                contentDescription = "Volume",
                tint = DesignTokens.Colors.Text.secondary,
                modifier = Modifier.height(20.dp),
            )
            Slider(
                value = volume,
                onValueChange = onVolumeChanged,
                modifier = Modifier.weight(1f),
                colors = SliderDefaults.colors(
                    thumbColor = DesignTokens.Colors.Primary.light,
                    activeTrackColor = DesignTokens.Colors.Primary.light,
                    inactiveTrackColor = DesignTokens.Colors.Glass.border,
                ),
            )
            Text(
                text = "${(volume * 100).toInt()}%",
                color = DesignTokens.Colors.Text.secondary,
                fontSize = DesignTokens.FontSize.sm,
            )
        }

        Spacer(modifier = Modifier.height(DesignTokens.Spacing.md))

        Text(
            text = "Target Language",
            color = DesignTokens.Colors.Text.secondary,
            fontSize = DesignTokens.FontSize.sm,
            fontWeight = FontWeight.SemiBold,
        )
        Row(
            modifier = Modifier.padding(top = DesignTokens.Spacing.sm),
            horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm),
        ) {
            availableLanguages.forEach { lang ->
                GlassChip(
                    label = SubtitleLanguages.badge(lang),
                    isSelected = lang == targetLanguage,
                    onClick = { onLanguageSelected(lang) },
                )
            }
        }

        if (availableVoices.isNotEmpty()) {
            Spacer(modifier = Modifier.height(DesignTokens.Spacing.md))
            Text(
                text = "Voice",
                color = DesignTokens.Colors.Text.secondary,
                fontSize = DesignTokens.FontSize.sm,
                fontWeight = FontWeight.SemiBold,
            )
            Row(
                modifier = Modifier.padding(top = DesignTokens.Spacing.sm),
                horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm),
            ) {
                availableVoices.forEach { voice ->
                    GlassChip(
                        label = voice.name,
                        isSelected = voice.id == voiceId,
                        onClick = { onVoiceSelected(voice.id) },
                    )
                }
            }
        }
    }
}

data class VoiceOption(
    val id: String,
    val name: String,
    val language: String,
)

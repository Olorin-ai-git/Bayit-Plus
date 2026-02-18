package tv.bayit.plus.feature.player.dubbing

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import tv.bayit.plus.core.model.DubbingVoice
import tv.bayit.plus.designsystem.component.GlassLoadingIndicator
import tv.bayit.plus.designsystem.component.GlassModal
import tv.bayit.plus.designsystem.i18n.bayitString
import tv.bayit.plus.designsystem.modifier.glassMorphism
import tv.bayit.plus.designsystem.theme.DesignTokens

@Composable
fun DubbingVoiceSelectorSheet(
    voices: List<DubbingVoice>,
    selectedVoiceId: String?,
    isLoading: Boolean,
    onVoiceSelected: (DubbingVoice) -> Unit,
    onDismiss: () -> Unit,
) {
    GlassModal(onDismissRequest = onDismiss) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(DesignTokens.Spacing.lg),
        ) {
            Text(
                text = bayitString("dubbing.voiceSelector.title"),
                color = DesignTokens.Colors.Text.primary,
                fontSize = DesignTokens.FontSize.xl,
                fontWeight = FontWeight.Bold,
            )
            Spacer(modifier = Modifier.height(DesignTokens.Spacing.xs))
            Text(
                text = bayitString("dubbing.voiceSelector.subtitle"),
                color = DesignTokens.Colors.Text.secondary,
                fontSize = DesignTokens.FontSize.sm,
            )
            Spacer(modifier = Modifier.height(DesignTokens.Spacing.md))

            if (isLoading) {
                GlassLoadingIndicator()
            } else {
                LazyColumn(
                    verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm),
                ) {
                    items(
                        items = voices,
                        key = { it.id },
                    ) { voice ->
                        VoiceRow(
                            voice = voice,
                            isSelected = voice.id == selectedVoiceId,
                            onClick = { onVoiceSelected(voice) },
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(DesignTokens.Spacing.lg))
        }
    }
}

@Composable
private fun VoiceRow(
    voice: DubbingVoice,
    isSelected: Boolean,
    onClick: () -> Unit,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .glassMorphism(
                cornerRadius = DesignTokens.Radius.md,
                backgroundColor = if (isSelected) {
                    DesignTokens.Colors.Glass.purpleLight
                } else {
                    DesignTokens.Colors.Glass.bg
                },
            )
            .clickable(onClick = onClick)
            .padding(DesignTokens.Spacing.md),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = voice.name,
                color = DesignTokens.Colors.Text.primary,
                fontSize = DesignTokens.FontSize.base,
                fontWeight = FontWeight.Medium,
            )
            Row {
                Text(
                    text = voice.language,
                    color = DesignTokens.Colors.Text.tertiary,
                    fontSize = DesignTokens.FontSize.xs,
                )
                voice.description?.let { desc ->
                    Spacer(modifier = Modifier.width(DesignTokens.Spacing.sm))
                    Text(
                        text = desc,
                        color = DesignTokens.Colors.Text.tertiary,
                        fontSize = DesignTokens.FontSize.xs,
                    )
                }
            }
        }

        if (isSelected) {
            Icon(
                imageVector = Icons.Default.Check,
                contentDescription = bayitString("dubbing.voiceSelector.selected"),
                tint = DesignTokens.Colors.Primary.light,
                modifier = Modifier.size(20.dp),
            )
        }
    }
}

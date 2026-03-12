package tv.bayit.plus.feature.player.subtitles

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import tv.bayit.plus.designsystem.component.GlassButton
import tv.bayit.plus.designsystem.component.GlassModal
import tv.bayit.plus.designsystem.component.GlassSpinner
import tv.bayit.plus.designsystem.modifier.glassMorphism
import tv.bayit.plus.designsystem.theme.DesignTokens
import tv.bayit.plus.designsystem.i18n.bayitString

/**
 * Confirmation dialog shown before starting AI subtitle generation.
 * Explains the operation and AI token cost. Shows progress when generating.
 */
@Composable
fun AIGenerationConfirmDialog(
    request: AIGenerationRequest,
    isGenerating: Boolean,
    onConfirm: () -> Unit,
    onDismiss: () -> Unit,
) {
    val modeDisplayName = bayitString("subtitles.mode.${request.modeName}")
    val modeDescription = bayitString("subtitles.mode.${request.modeName}_description")

    GlassModal(onDismissRequest = { if (!isGenerating) onDismiss() }) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(DesignTokens.Spacing.base),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Icon(
                imageVector = Icons.Default.AutoAwesome,
                contentDescription = null,
                tint = DesignTokens.Colors.Primary.light,
                modifier = Modifier.size(32.dp),
            )

            Spacer(modifier = Modifier.height(DesignTokens.Spacing.md))

            Text(
                text = bayitString("player.ai.generateSubtitles", mapOf("mode" to modeDisplayName)),
                color = DesignTokens.Colors.Text.primary,
                fontSize = DesignTokens.FontSize.lg,
                fontWeight = FontWeight.Bold,
                textAlign = TextAlign.Center,
            )

            Spacer(modifier = Modifier.height(DesignTokens.Spacing.sm))

            Text(
                text = modeDescription,
                color = DesignTokens.Colors.Text.secondary,
                fontSize = DesignTokens.FontSize.sm,
                textAlign = TextAlign.Center,
            )

            Spacer(modifier = Modifier.height(DesignTokens.Spacing.md))

            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .glassMorphism(
                        cornerRadius = DesignTokens.Radius.md,
                        backgroundColor = DesignTokens.Colors.Glass.bgMedium,
                    )
                    .padding(DesignTokens.Spacing.md),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.Center,
            ) {
                Icon(
                    imageVector = Icons.Default.AutoAwesome,
                    contentDescription = null,
                    tint = DesignTokens.Colors.Primary.light,
                    modifier = Modifier.size(16.dp),
                )
                Text(
                    text = bayitString("player.ai.aiCreditCost"),
                    color = DesignTokens.Colors.Text.secondary,
                    fontSize = DesignTokens.FontSize.sm,
                    modifier = Modifier.padding(start = DesignTokens.Spacing.xs),
                )
            }

            Spacer(modifier = Modifier.height(DesignTokens.Spacing.lg))

            if (isGenerating) {
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    GlassSpinner(modifier = Modifier.size(40.dp))
                    Spacer(modifier = Modifier.height(DesignTokens.Spacing.sm))
                    Text(
                        text = bayitString("player.ai.generatingSubtitles", mapOf("mode" to modeDisplayName)),
                        color = DesignTokens.Colors.Text.secondary,
                        fontSize = DesignTokens.FontSize.sm,
                    )
                }
            } else {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm),
                ) {
                    GlassButton(
                        text = bayitString("common.cancel"),
                        onClick = onDismiss,
                        modifier = Modifier.weight(1f),
                    )
                    GlassButton(
                        text = bayitString("player.ai.generate"),
                        onClick = onConfirm,
                        modifier = Modifier.weight(1f),
                    )
                }
            }
        }
    }
}

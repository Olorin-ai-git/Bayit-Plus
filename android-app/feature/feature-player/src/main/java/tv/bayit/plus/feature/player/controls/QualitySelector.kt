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
import tv.bayit.plus.core.model.QualityVariant
import tv.bayit.plus.designsystem.component.GlassCard
import tv.bayit.plus.designsystem.modifier.glassMorphism
import tv.bayit.plus.designsystem.theme.DesignTokens

/**
 * Video quality selection control.
 */
@Composable
fun QualitySelector(
    currentQuality: String,
    availableQualities: List<QualityVariant>,
    onQualitySelected: (QualityVariant) -> Unit,
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
            text = "Video Quality",
            color = DesignTokens.Colors.Text.primary,
            fontSize = DesignTokens.FontSize.base,
            fontWeight = FontWeight.SemiBold,
        )

        Column(
            modifier = Modifier.padding(top = DesignTokens.Spacing.sm),
            verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.xs),
        ) {
            availableQualities.forEach { quality ->
                QualityRow(
                    quality = quality,
                    isSelected = quality.quality == currentQuality,
                    onClick = { onQualitySelected(quality) },
                )
            }
        }
    }
}

@Composable
private fun QualityRow(
    quality: QualityVariant,
    isSelected: Boolean,
    onClick: () -> Unit,
) {
    GlassCard(modifier = Modifier.fillMaxWidth().clickable(onClick = onClick)) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween,
        ) {
            Column {
                Text(
                    text = quality.quality,
                    color = DesignTokens.Colors.Text.primary,
                    fontSize = DesignTokens.FontSize.base,
                    fontWeight = FontWeight.Medium,
                )
                quality.resolutionHeight?.let { height ->
                    Text(
                        text = "${height}p",
                        color = DesignTokens.Colors.Text.secondary,
                        fontSize = DesignTokens.FontSize.xs,
                    )
                }
            }
            if (isSelected) {
                Icon(
                    imageVector = Icons.Default.Check,
                    contentDescription = "Selected",
                    tint = DesignTokens.Colors.Semantic.success,
                    modifier = Modifier.padding(end = DesignTokens.Spacing.xs),
                )
            }
        }
    }
}

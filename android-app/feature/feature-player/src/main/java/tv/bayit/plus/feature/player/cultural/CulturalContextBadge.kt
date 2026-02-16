package tv.bayit.plus.feature.player.cultural

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Info
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import tv.bayit.plus.designsystem.modifier.glassMorphism
import tv.bayit.plus.designsystem.theme.DesignTokens

/**
 * Badge indicating cultural context is available for the current scene.
 */
@Composable
fun CulturalContextBadge(
    label: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Row(
        modifier = modifier
            .glassMorphism(
                cornerRadius = DesignTokens.Radius.full,
                backgroundColor = DesignTokens.Colors.Glass.purpleLight,
            )
            .clickable(onClick = onClick)
            .padding(
                horizontal = DesignTokens.Spacing.md,
                vertical = DesignTokens.Spacing.xs,
            ),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.xs),
    ) {
        Icon(
            imageVector = Icons.Default.Info,
            contentDescription = null,
            tint = DesignTokens.Colors.Primary.light,
            modifier = Modifier.size(14.dp),
        )
        Text(
            text = label,
            color = DesignTokens.Colors.Primary.light,
            fontSize = DesignTokens.FontSize.xs,
            fontWeight = FontWeight.SemiBold,
        )
    }
}

/**
 * Bottom sheet with cultural context explanation for the current scene.
 */
@Composable
fun CulturalExplanationSheet(
    title: String,
    explanation: String,
    category: String?,
    onDismiss: () -> Unit,
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
        category?.let { cat ->
            Text(
                text = cat,
                color = DesignTokens.Colors.Primary.light,
                fontSize = DesignTokens.FontSize.xs,
                fontWeight = FontWeight.Bold,
            )
        }

        Text(
            text = title,
            color = DesignTokens.Colors.Text.primary,
            fontSize = DesignTokens.FontSize.lg,
            fontWeight = FontWeight.Bold,
        )

        Spacer(modifier = Modifier.height(DesignTokens.Spacing.sm))

        Text(
            text = explanation,
            color = DesignTokens.Colors.Text.secondary,
            fontSize = DesignTokens.FontSize.base,
        )
    }
}

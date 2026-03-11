package tv.bayit.plus.feature.home

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.Star
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import tv.bayit.plus.designsystem.component.GlassProgressBar
import tv.bayit.plus.designsystem.i18n.bayitString
import tv.bayit.plus.designsystem.modifier.glassMorphism
import tv.bayit.plus.designsystem.theme.DesignTokens

@Composable
internal fun CreditsBadge(
    remainingCredits: Int,
    totalCredits: Int,
    isPlus: Boolean,
    onNavigateToSubscribe: () -> Unit,
    modifier: Modifier = Modifier,
) {
    if (isPlus) {
        PlusMemberBadge(modifier = modifier)
    } else {
        FreeTierBadge(
            remainingCredits = remainingCredits,
            totalCredits = totalCredits,
            onNavigateToSubscribe = onNavigateToSubscribe,
            modifier = modifier,
        )
    }
}

@Composable
private fun PlusMemberBadge(modifier: Modifier = Modifier) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .glassMorphism(
                backgroundColor = DesignTokens.Colors.Glass.purpleLight,
                borderColor = DesignTokens.Colors.Primary.p400.copy(alpha = 0.3f),
            )
            .padding(DesignTokens.Spacing.base),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.Center,
    ) {
        Icon(
            imageVector = Icons.Default.Star,
            contentDescription = null,
            tint = DesignTokens.Colors.gold,
            modifier = Modifier.size(20.dp),
        )
        Spacer(modifier = Modifier.width(DesignTokens.Spacing.sm))
        Text(
            text = bayitString("plus.badge.subscribedLabel"),
            style = MaterialTheme.typography.titleSmall,
            color = DesignTokens.Colors.Text.primary,
            fontWeight = FontWeight.SemiBold,
        )
        Spacer(modifier = Modifier.width(DesignTokens.Spacing.sm))
        Text(
            text = bayitString("plus.badge.unlimited"),
            style = MaterialTheme.typography.bodySmall,
            color = DesignTokens.Colors.Text.secondary,
        )
    }
}

@Composable
private fun FreeTierBadge(
    remainingCredits: Int,
    totalCredits: Int,
    onNavigateToSubscribe: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val progress = if (totalCredits > 0) {
        remainingCredits.toFloat() / totalCredits.toFloat()
    } else {
        0f
    }

    Column(
        modifier = modifier
            .fillMaxWidth()
            .glassMorphism()
            .clickable(onClick = onNavigateToSubscribe)
            .padding(DesignTokens.Spacing.base),
        verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm),
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    imageVector = Icons.Default.AutoAwesome,
                    contentDescription = null,
                    tint = DesignTokens.Colors.Primary.light,
                    modifier = Modifier.size(20.dp),
                )
                Spacer(modifier = Modifier.width(DesignTokens.Spacing.sm))
                Text(
                    text = bayitString(
                        "plus.badge.creditsRemaining",
                        mapOf("count" to remainingCredits.toString()),
                    ),
                    style = MaterialTheme.typography.bodyMedium,
                    color = DesignTokens.Colors.Text.primary,
                    fontWeight = FontWeight.Medium,
                )
            }

            UpgradePill(onClick = onNavigateToSubscribe)
        }

        GlassProgressBar(progress = progress)
    }
}

@Composable
private fun UpgradePill(
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val shape = RoundedCornerShape(DesignTokens.Radius.full)
    Text(
        text = bayitString("plus.badge.upgradeNow"),
        color = DesignTokens.Colors.Text.primary,
        fontSize = DesignTokens.FontSize.sm,
        fontWeight = FontWeight.SemiBold,
        modifier = modifier
            .clip(shape)
            .background(DesignTokens.Colors.Primary.base, shape)
            .clickable(onClick = onClick)
            .padding(
                horizontal = DesignTokens.Spacing.md,
                vertical = DesignTokens.Spacing.xs,
            ),
    )
}

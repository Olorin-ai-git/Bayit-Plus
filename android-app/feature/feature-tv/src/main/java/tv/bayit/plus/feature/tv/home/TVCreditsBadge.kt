package tv.bayit.plus.feature.tv.home

import androidx.compose.foundation.background
import androidx.compose.foundation.focusable
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
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.tv.material3.Text
import tv.bayit.plus.designsystem.component.GlassProgressBar
import tv.bayit.plus.designsystem.i18n.bayitString
import tv.bayit.plus.designsystem.modifier.glassMorphism
import tv.bayit.plus.designsystem.theme.DesignTokens
import tv.bayit.plus.feature.tv.design.TVDesignTokens

@Composable
internal fun TVCreditsBadge(
    remainingCredits: Int,
    totalCredits: Int,
    isPlus: Boolean,
    modifier: Modifier = Modifier,
) {
    if (isPlus) {
        TVPlusMemberBadge(modifier = modifier)
    } else {
        TVFreeTierBadge(
            remainingCredits = remainingCredits,
            totalCredits = totalCredits,
            modifier = modifier,
        )
    }
}

@Composable
private fun TVPlusMemberBadge(modifier: Modifier = Modifier) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .glassMorphism(
                backgroundColor = DesignTokens.Colors.Glass.purpleLight,
                borderColor = DesignTokens.Colors.Primary.p400.copy(alpha = 0.3f),
            )
            .focusable()
            .padding(TVDesignTokens.Spacing.cardPadding),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.Center,
    ) {
        Icon(
            imageVector = Icons.Default.Star,
            contentDescription = null,
            tint = DesignTokens.Colors.gold,
            modifier = Modifier.size(28.dp),
        )
        Spacer(modifier = Modifier.width(DesignTokens.Spacing.md))
        Text(
            text = bayitString("plus.badge.subscribedLabel"),
            color = DesignTokens.Colors.Text.primary,
            fontSize = TVDesignTokens.FontSize.title,
            fontWeight = FontWeight.SemiBold,
        )
        Spacer(modifier = Modifier.width(DesignTokens.Spacing.md))
        Text(
            text = bayitString("plus.badge.unlimited"),
            color = DesignTokens.Colors.Text.secondary,
            fontSize = TVDesignTokens.FontSize.bodyLarge,
        )
    }
}

@Composable
private fun TVFreeTierBadge(
    remainingCredits: Int,
    totalCredits: Int,
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
            .focusable()
            .padding(TVDesignTokens.Spacing.cardPadding),
        verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md),
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
                    modifier = Modifier.size(28.dp),
                )
                Spacer(modifier = Modifier.width(DesignTokens.Spacing.md))
                Text(
                    text = bayitString(
                        "plus.badge.creditsRemaining",
                        mapOf("count" to remainingCredits.toString()),
                    ),
                    color = DesignTokens.Colors.Text.primary,
                    fontSize = TVDesignTokens.FontSize.title,
                    fontWeight = FontWeight.Medium,
                )
            }

            TVSubscribeHint()
        }

        GlassProgressBar(progress = progress)
    }
}

@Composable
private fun TVSubscribeHint(modifier: Modifier = Modifier) {
    val shape = RoundedCornerShape(DesignTokens.Radius.full)
    Text(
        text = bayitString("plus.badge.subscribeAtWeb"),
        color = DesignTokens.Colors.Text.primary,
        fontSize = TVDesignTokens.FontSize.bodyLarge,
        fontWeight = FontWeight.SemiBold,
        modifier = modifier
            .clip(shape)
            .background(DesignTokens.Colors.Primary.base, shape)
            .padding(
                horizontal = DesignTokens.Spacing.lg,
                vertical = DesignTokens.Spacing.sm,
            ),
    )
}

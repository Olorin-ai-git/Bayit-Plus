package tv.bayit.plus.feature.home

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import tv.bayit.plus.designsystem.i18n.bayitString
import tv.bayit.plus.designsystem.theme.DesignTokens

/** Plus subscription features available for promotion on the home screen. */
enum class PlusFeature(val i18nKey: String) {
    DUBBING("plus.feature.dubbing"),
    SUBTITLES("plus.feature.subtitles"),
    SEARCH("plus.feature.search"),
}

/**
 * Promotional card highlighting a Plus subscription feature.
 * Crown icon + feature text + "Learn More" chevron.
 * Clicking navigates to the subscription screen.
 */
@Composable
fun PlusFeatureCard(
    feature: PlusFeature,
    onNavigateToSubscribe: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = DesignTokens.Spacing.lg)
            .clip(RoundedCornerShape(DesignTokens.Radius.lg))
            .background(
                DesignTokens.Colors.Glass.bg.copy(alpha = 0.6f),
                RoundedCornerShape(DesignTokens.Radius.lg),
            )
            .clickable(onClick = onNavigateToSubscribe)
            .padding(
                horizontal = DesignTokens.Spacing.lg,
                vertical = DesignTokens.Spacing.md,
            ),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md),
    ) {
        Text(
            text = "\uD83D\uDC51",
            style = MaterialTheme.typography.titleLarge,
        )

        Text(
            text = bayitString(feature.i18nKey),
            style = MaterialTheme.typography.bodyLarge,
            color = DesignTokens.Colors.Text.primary,
            fontWeight = FontWeight.Medium,
            modifier = Modifier.weight(1f),
            maxLines = 2,
        )

        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.xs),
        ) {
            Text(
                text = bayitString("common.learnMore"),
                style = MaterialTheme.typography.labelLarge,
                color = DesignTokens.Colors.Primary.base,
                fontWeight = FontWeight.SemiBold,
            )

            Icon(
                imageVector = Icons.AutoMirrored.Filled.KeyboardArrowRight,
                contentDescription = null,
                tint = DesignTokens.Colors.Primary.base,
                modifier = Modifier.size(20.dp),
            )
        }
    }
}

package tv.bayit.plus.feature.tv.auth

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.runtime.Composable

import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.tv.material3.Text
import tv.bayit.plus.designsystem.component.GlassTVButton
import tv.bayit.plus.designsystem.i18n.bayitString
import tv.bayit.plus.designsystem.theme.DesignTokens
import tv.bayit.plus.feature.tv.design.TVDesignTokens

@Composable
fun TVUpsellScreen(
    onBack: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val title = bayitString("subscription_required")
    val message = bayitString("subscription_upsell_tv")
    val backLabel = bayitString("go_back")

    Box(
        modifier = modifier.fillMaxSize(),
        contentAlignment = Alignment.Center,
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.lg),
        ) {
            Text(
                text = title,
                color = DesignTokens.Colors.Text.primary,
                fontSize = TVDesignTokens.FontSize.titleLarge,
                fontWeight = FontWeight.Bold,
            )
            Text(
                text = message,
                color = DesignTokens.Colors.Text.secondary,
                fontSize = TVDesignTokens.FontSize.bodyLarge,
                modifier = Modifier.padding(horizontal = TVDesignTokens.Spacing.screenPadding),
            )
            GlassTVButton(
                text = backLabel,
                onClick = onBack,
            )
        }
    }
}

package tv.bayit.plus.feature.player.dubbing

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import tv.bayit.plus.designsystem.component.GlassButton
import tv.bayit.plus.designsystem.i18n.bayitString
import tv.bayit.plus.designsystem.modifier.glassMorphism
import tv.bayit.plus.designsystem.theme.DesignTokens

/**
 * Premium gate displayed when a user tries to access dubbing without a subscription.
 */
@Composable
fun DubbingPremiumGate(
    onUpgrade: () -> Unit,
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
            .padding(DesignTokens.Spacing.xl),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Icon(
            imageVector = Icons.Default.Lock,
            contentDescription = null,
            tint = DesignTokens.Colors.gold,
            modifier = Modifier.size(48.dp),
        )

        Spacer(modifier = Modifier.height(DesignTokens.Spacing.md))

        Text(
            text = bayitString("player.dubbing.premiumTitle"),
            color = DesignTokens.Colors.Text.primary,
            fontSize = DesignTokens.FontSize.lg,
            fontWeight = FontWeight.Bold,
            textAlign = TextAlign.Center,
        )

        Spacer(modifier = Modifier.height(DesignTokens.Spacing.sm))

        Text(
            text = bayitString("player.dubbing.premiumMessage"),
            color = DesignTokens.Colors.Text.secondary,
            fontSize = DesignTokens.FontSize.base,
            textAlign = TextAlign.Center,
        )

        Spacer(modifier = Modifier.height(DesignTokens.Spacing.xl))

        GlassButton(text = bayitString("player.dubbing.upgrade"), onClick = onUpgrade)

        Spacer(modifier = Modifier.height(DesignTokens.Spacing.sm))

        GlassButton(text = bayitString("player.dubbing.notNow"), onClick = onDismiss)
    }
}

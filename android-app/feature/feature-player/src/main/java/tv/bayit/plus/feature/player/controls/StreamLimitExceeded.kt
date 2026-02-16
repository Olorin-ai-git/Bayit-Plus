package tv.bayit.plus.feature.player.controls

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Error
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import tv.bayit.plus.designsystem.component.GlassButton
import tv.bayit.plus.designsystem.theme.DesignTokens

/**
 * Screen displayed when concurrent stream limit is exceeded.
 */
@Composable
fun StreamLimitExceeded(
    maxStreams: Int,
    onUpgrade: () -> Unit,
    onGoBack: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier = modifier
            .fillMaxSize()
            .padding(DesignTokens.Spacing.xl),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Icon(
            imageVector = Icons.Default.Error,
            contentDescription = null,
            tint = DesignTokens.Colors.Semantic.warning,
            modifier = Modifier.size(48.dp),
        )

        Spacer(modifier = Modifier.height(DesignTokens.Spacing.md))

        Text(
            text = "Stream Limit Reached",
            color = DesignTokens.Colors.Text.primary,
            fontSize = DesignTokens.FontSize.xl,
            fontWeight = FontWeight.Bold,
            textAlign = TextAlign.Center,
        )

        Spacer(modifier = Modifier.height(DesignTokens.Spacing.sm))

        Text(
            text = "You have reached the maximum of $maxStreams concurrent streams. " +
                "Please stop another stream or upgrade your plan.",
            color = DesignTokens.Colors.Text.secondary,
            fontSize = DesignTokens.FontSize.base,
            textAlign = TextAlign.Center,
        )

        Spacer(modifier = Modifier.height(DesignTokens.Spacing.xl))

        GlassButton(text = "Upgrade Plan", onClick = onUpgrade)

        Spacer(modifier = Modifier.height(DesignTokens.Spacing.sm))

        GlassButton(text = "Go Back", onClick = onGoBack)
    }
}

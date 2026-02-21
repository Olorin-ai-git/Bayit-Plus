package tv.bayit.plus.feature.player.catchup

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import tv.bayit.plus.designsystem.component.GlassButton
import tv.bayit.plus.designsystem.component.GlassLoadingIndicator
import tv.bayit.plus.designsystem.i18n.bayitString
import tv.bayit.plus.designsystem.modifier.glassMorphism
import tv.bayit.plus.designsystem.theme.DesignTokens

@Composable
fun CatchUpScreen(
    uiState: CatchUpUiState,
    summary: CatchUpSummaryUi?,
    remainingCredits: Int?,
    onGenerateSummary: () -> Unit,
    onDismiss: () -> Unit,
    modifier: Modifier = Modifier,
) {
    when (uiState) {
        is CatchUpUiState.AutoPrompt -> CatchUpAutoPrompt(
            remainingCredits = remainingCredits,
            onAccept = onGenerateSummary,
            onDismiss = onDismiss,
            modifier = modifier,
        )
        is CatchUpUiState.Loading -> GlassLoadingIndicator()
        is CatchUpUiState.Summary -> CatchUpSummaryView(
            summary = summary,
            onDismiss = onDismiss,
            modifier = modifier,
        )
        is CatchUpUiState.Error -> CatchUpError(
            message = uiState.message,
            onDismiss = onDismiss,
            modifier = modifier,
        )
        is CatchUpUiState.Hidden -> { /* No UI */ }
    }
}

@Composable
private fun CatchUpAutoPrompt(
    remainingCredits: Int?,
    onAccept: () -> Unit,
    onDismiss: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier = modifier
            .fillMaxWidth()
            .glassMorphism(
                cornerRadius = DesignTokens.Radius.md,
                backgroundColor = DesignTokens.Colors.Glass.purpleLight,
            )
            .padding(DesignTokens.Spacing.md),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text(
            text = bayitString("player.catchup.title"),
            color = DesignTokens.Colors.Text.primary,
            fontSize = DesignTokens.FontSize.lg,
            fontWeight = FontWeight.Bold,
        )
        Spacer(modifier = Modifier.height(DesignTokens.Spacing.sm))
        Text(
            text = bayitString("player.catchup.description"),
            color = DesignTokens.Colors.Text.secondary,
            fontSize = DesignTokens.FontSize.base,
        )
        if (remainingCredits != null) {
            Spacer(modifier = Modifier.height(DesignTokens.Spacing.xs))
            Text(
                text = bayitString("player.catchup.creditsRemaining", mapOf("count" to remainingCredits.toString())),
                color = DesignTokens.Colors.Text.muted,
                fontSize = DesignTokens.FontSize.sm,
            )
        }
        Spacer(modifier = Modifier.height(DesignTokens.Spacing.md))
        GlassButton(text = bayitString("player.catchup.generateSummary"), onClick = onAccept)
        Spacer(modifier = Modifier.height(DesignTokens.Spacing.sm))
        GlassButton(text = bayitString("player.controls.skip"), onClick = onDismiss)
    }
}


@Composable
private fun CatchUpError(
    message: String,
    onDismiss: () -> Unit,
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
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text(
            text = message,
            color = DesignTokens.Colors.Semantic.error,
            fontSize = DesignTokens.FontSize.base,
        )
        Spacer(modifier = Modifier.height(DesignTokens.Spacing.md))
        GlassButton(
            text = bayitString("player.controls.dismiss"),
            onClick = onDismiss,
        )
    }
}

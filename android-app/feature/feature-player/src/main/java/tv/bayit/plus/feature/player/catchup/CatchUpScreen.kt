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
import tv.bayit.plus.designsystem.modifier.glassMorphism
import tv.bayit.plus.designsystem.theme.DesignTokens

/**
 * Catch-up summary display with auto-prompt and summary views.
 */
@Composable
fun CatchUpScreen(
    uiState: CatchUpUiState,
    summary: String?,
    onGenerateSummary: () -> Unit,
    onDismiss: () -> Unit,
    modifier: Modifier = Modifier,
) {
    when (uiState) {
        is CatchUpUiState.AutoPrompt -> CatchUpAutoPrompt(
            onAccept = onGenerateSummary,
            onDismiss = onDismiss,
            modifier = modifier,
        )
        is CatchUpUiState.Loading -> GlassLoadingIndicator()
        is CatchUpUiState.Summary -> CatchUpSummary(
            summary = summary.orEmpty(),
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
fun CatchUpAutoPrompt(
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
            text = "Catch Up",
            color = DesignTokens.Colors.Text.primary,
            fontSize = DesignTokens.FontSize.lg,
            fontWeight = FontWeight.Bold,
        )
        Spacer(modifier = Modifier.height(DesignTokens.Spacing.sm))
        Text(
            text = "Missed the beginning? Get an AI-powered summary of what happened so far.",
            color = DesignTokens.Colors.Text.secondary,
            fontSize = DesignTokens.FontSize.base,
        )
        Spacer(modifier = Modifier.height(DesignTokens.Spacing.md))
        GlassButton(text = "Generate Summary", onClick = onAccept)
        Spacer(modifier = Modifier.height(DesignTokens.Spacing.sm))
        GlassButton(text = "Skip", onClick = onDismiss)
    }
}

@Composable
fun CatchUpSummary(
    summary: String,
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
    ) {
        Text(
            text = "Summary",
            color = DesignTokens.Colors.Primary.light,
            fontSize = DesignTokens.FontSize.lg,
            fontWeight = FontWeight.Bold,
        )
        Spacer(modifier = Modifier.height(DesignTokens.Spacing.sm))
        Text(
            text = summary,
            color = DesignTokens.Colors.Text.primary,
            fontSize = DesignTokens.FontSize.base,
        )
        Spacer(modifier = Modifier.height(DesignTokens.Spacing.md))
        GlassButton(text = "Continue Watching", onClick = onDismiss)
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
        GlassButton(text = "Dismiss", onClick = onDismiss)
    }
}

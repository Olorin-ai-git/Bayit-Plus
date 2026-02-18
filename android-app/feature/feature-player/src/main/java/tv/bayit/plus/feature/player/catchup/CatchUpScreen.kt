package tv.bayit.plus.feature.player.catchup

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import tv.bayit.plus.core.model.TranscriptSegment
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
                text = bayitString("player.catchup.creditsRemaining", remainingCredits),
                color = DesignTokens.Colors.Text.tertiary,
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
private fun CatchUpSummaryView(
    summary: CatchUpSummaryUi?,
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
        if (summary?.programInfo?.title != null) {
            Text(
                text = summary.programInfo.title,
                color = DesignTokens.Colors.Primary.light,
                fontSize = DesignTokens.FontSize.lg,
                fontWeight = FontWeight.Bold,
            )
            Spacer(modifier = Modifier.height(DesignTokens.Spacing.xs))
        }

        Text(
            text = bayitString("player.catchup.summaryTitle"),
            color = DesignTokens.Colors.Text.secondary,
            fontSize = DesignTokens.FontSize.sm,
            fontWeight = FontWeight.Bold,
        )
        Spacer(modifier = Modifier.height(DesignTokens.Spacing.sm))
        Text(
            text = summary?.text.orEmpty(),
            color = DesignTokens.Colors.Text.primary,
            fontSize = DesignTokens.FontSize.base,
        )

        val keyPoints = summary?.keyPoints.orEmpty()
        if (keyPoints.isNotEmpty()) {
            Spacer(modifier = Modifier.height(DesignTokens.Spacing.md))
            Text(
                text = bayitString("player.catchup.keyPoints"),
                color = DesignTokens.Colors.Text.secondary,
                fontSize = DesignTokens.FontSize.sm,
                fontWeight = FontWeight.Bold,
            )
            Spacer(modifier = Modifier.height(DesignTokens.Spacing.xs))
            keyPoints.forEach { point ->
                Row(modifier = Modifier.padding(vertical = DesignTokens.Spacing.xxs)) {
                    Text(
                        text = "\u2022",
                        color = DesignTokens.Colors.Primary.light,
                        fontSize = DesignTokens.FontSize.base,
                    )
                    Spacer(modifier = Modifier.width(DesignTokens.Spacing.sm))
                    Text(
                        text = point,
                        color = DesignTokens.Colors.Text.primary,
                        fontSize = DesignTokens.FontSize.base,
                    )
                }
            }
        }

        if (summary?.creditsUsed != null) {
            Spacer(modifier = Modifier.height(DesignTokens.Spacing.sm))
            Text(
                text = bayitString(
                    "player.catchup.creditsInfo",
                    summary.creditsUsed,
                    summary.remainingCredits ?: 0,
                ),
                color = DesignTokens.Colors.Text.tertiary,
                fontSize = DesignTokens.FontSize.xs,
            )
        }

        Spacer(modifier = Modifier.height(DesignTokens.Spacing.md))
        GlassButton(
            text = bayitString("player.controls.continueWatching"),
            onClick = onDismiss,
        )
    }
}

@Composable
fun TranscriptTimeline(
    segments: List<TranscriptSegment>,
    onSegmentClick: (TranscriptSegment) -> Unit,
    modifier: Modifier = Modifier,
) {
    if (segments.isEmpty()) return

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
            text = bayitString("player.catchup.transcript"),
            color = DesignTokens.Colors.Primary.light,
            fontSize = DesignTokens.FontSize.lg,
            fontWeight = FontWeight.Bold,
        )
        Spacer(modifier = Modifier.height(DesignTokens.Spacing.sm))

        LazyColumn {
            items(
                items = segments,
                key = { it.stableId },
            ) { segment ->
                TranscriptSegmentRow(
                    segment = segment,
                    onClick = { onSegmentClick(segment) },
                )
            }
        }
    }
}

@Composable
private fun TranscriptSegmentRow(
    segment: TranscriptSegment,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(
                vertical = DesignTokens.Spacing.xs,
                horizontal = DesignTokens.Spacing.sm,
            ),
        verticalAlignment = Alignment.Top,
    ) {
        Text(
            text = formatTimestamp(segment.startTimeMs ?: 0L),
            color = DesignTokens.Colors.Primary.light,
            fontSize = DesignTokens.FontSize.sm,
            fontWeight = FontWeight.Medium,
        )
        Spacer(modifier = Modifier.width(DesignTokens.Spacing.sm))
        Column(modifier = Modifier.weight(1f)) {
            if (segment.speaker != null) {
                Text(
                    text = segment.speaker,
                    color = DesignTokens.Colors.Text.secondary,
                    fontSize = DesignTokens.FontSize.xs,
                    fontWeight = FontWeight.Bold,
                )
            }
            Text(
                text = segment.text.orEmpty(),
                color = DesignTokens.Colors.Text.primary,
                fontSize = DesignTokens.FontSize.sm,
            )
        }
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

private fun formatTimestamp(ms: Long): String {
    val totalSeconds = ms / 1000
    val minutes = totalSeconds / 60
    val seconds = totalSeconds % 60
    return "%d:%02d".format(minutes, seconds)
}

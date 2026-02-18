package tv.bayit.plus.feature.zehani.v2v

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import tv.bayit.plus.core.model.zehani.V2VSession
import tv.bayit.plus.core.model.zehani.V2VTransformResult
import tv.bayit.plus.designsystem.component.GlassButton
import tv.bayit.plus.designsystem.component.GlassCard
import tv.bayit.plus.designsystem.theme.DesignTokens

@Composable
internal fun FeedbackSection(feedback: V2VTransformResult, onReset: () -> Unit, onNextPhrase: () -> Unit) {
    Column(
        modifier = Modifier.fillMaxSize().padding(DesignTokens.Spacing.base),
        verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md),
    ) {
        GlassCard(modifier = Modifier.fillMaxWidth()) {
            Column(verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm)) {
                Text(
                    text = "Pronunciation Feedback",
                    style = MaterialTheme.typography.titleMedium,
                    color = DesignTokens.Colors.Text.primary,
                    fontWeight = FontWeight.SemiBold,
                )
                Text(
                    text = "Similarity: ${(feedback.similarityScore * 100).toInt()}%",
                    style = MaterialTheme.typography.bodyLarge,
                    color = DesignTokens.Colors.Primary.light,
                    fontWeight = FontWeight.Bold,
                )
                feedback.pronunciationFeedback?.let { feedbackText ->
                    Text(text = feedbackText, color = DesignTokens.Colors.Text.secondary)
                }
            }
        }
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md)) {
            GlassButton(text = "Try Again", onClick = onReset, isPrimary = false, modifier = Modifier.weight(1f))
            GlassButton(text = "Next Phrase", onClick = { onNextPhrase(); onReset() }, modifier = Modifier.weight(1f))
        }
    }
}

@Composable
internal fun ProgressSection(sessions: List<V2VSession>, onReset: () -> Unit) {
    LazyColumn(
        modifier = Modifier.fillMaxSize().padding(DesignTokens.Spacing.base),
        verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm),
    ) {
        item {
            Text(
                text = "Your Progress",
                style = MaterialTheme.typography.titleMedium,
                color = DesignTokens.Colors.Text.primary,
                fontWeight = FontWeight.SemiBold,
            )
        }
        items(sessions, key = { it.id }) { session ->
            GlassCard(modifier = Modifier.fillMaxWidth()) {
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Column {
                        Text(text = "Transforms: ${session.totalTransforms}", color = DesignTokens.Colors.Text.primary)
                        Text(text = "Improvement: ${(session.scoreImprovement * 100).toInt()}%", color = DesignTokens.Colors.Text.secondary)
                    }
                    Text(text = session.status, color = DesignTokens.Colors.Text.muted, fontSize = DesignTokens.FontSize.sm)
                }
            }
        }
        item { GlassButton(text = "Continue Practicing", onClick = onReset) }
    }
}

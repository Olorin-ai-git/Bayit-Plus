package tv.bayit.plus.feature.trivia

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import tv.bayit.plus.designsystem.component.GlassButton
import tv.bayit.plus.designsystem.component.GlassCard
import tv.bayit.plus.designsystem.theme.DesignTokens

private const val LOW_TIME_THRESHOLD = 5

@Composable
internal fun TimerAndScoreBar(
    timeRemaining: Int,
    score: Int,
    questionNumber: Int,
    totalQuestions: Int,
    modifier: Modifier = Modifier,
) {
    Row(
        modifier = modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(
            text = "Q$questionNumber/$totalQuestions",
            style = MaterialTheme.typography.labelLarge,
            color = DesignTokens.Colors.Text.secondary,
        )
        GlassCard {
            Text(
                text = "${timeRemaining}s",
                style = MaterialTheme.typography.headlineSmall,
                color = if (timeRemaining <= LOW_TIME_THRESHOLD) {
                    DesignTokens.Colors.Semantic.error
                } else {
                    DesignTokens.Colors.Primary.light
                },
                fontWeight = FontWeight.Bold,
            )
        }
        Text(
            text = "Score: $score",
            style = MaterialTheme.typography.labelLarge,
            color = DesignTokens.Colors.gold,
            fontWeight = FontWeight.SemiBold,
        )
    }
}

@Composable
internal fun QuestionCard(questionText: String, modifier: Modifier = Modifier) {
    GlassCard(modifier = modifier.fillMaxWidth()) {
        Text(
            text = questionText,
            style = MaterialTheme.typography.titleLarge,
            color = DesignTokens.Colors.Text.primary,
            textAlign = TextAlign.Center,
            modifier = Modifier.fillMaxWidth(),
        )
    }
}

@Composable
internal fun AnswerOptions(
    options: List<String>,
    selectedAnswer: Int?,
    onAnswerSelected: (Int) -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier = modifier.fillMaxWidth(),
        verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm),
    ) {
        options.forEachIndexed { index, option ->
            GlassButton(
                text = option,
                onClick = { onAnswerSelected(index) },
                enabled = selectedAnswer == null,
                isPrimary = selectedAnswer == null,
                modifier = Modifier.fillMaxWidth(),
            )
        }
    }
}

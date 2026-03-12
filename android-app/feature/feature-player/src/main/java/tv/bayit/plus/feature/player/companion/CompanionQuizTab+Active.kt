package tv.bayit.plus.feature.player.companion

import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import tv.bayit.plus.designsystem.component.GlassButton
import tv.bayit.plus.designsystem.component.GlassCard
import tv.bayit.plus.designsystem.i18n.bayitString
import tv.bayit.plus.designsystem.theme.DesignTokens

/**
 * Active question card rendering for the AI companion quiz tab.
 *
 * Renders question text, radio-button answer options, correct/incorrect
 * coloring after selection, and a Next/Finish button to advance.
 */
@Composable
internal fun QuizActive(
    question: String,
    options: List<String>,
    correctIndex: Int,
    questionIndex: Int,
    totalQuestions: Int,
    selectedAnswer: Int?,
    onSelect: (Int) -> Unit,
    onAdvance: () -> Unit,
) {
    val isAnswered = selectedAnswer != null
    val isLastQuestion = questionIndex == totalQuestions - 1

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState()),
        verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md),
    ) {
        Text(
            text = bayitString(
                "player.companion.quizProgress",
                mapOf("current" to (questionIndex + 1).toString(), "total" to totalQuestions.toString()),
            ),
            color = DesignTokens.Colors.Text.muted,
            fontSize = DesignTokens.FontSize.sm,
        )

        GlassCard(modifier = Modifier.fillMaxWidth()) {
            Column(verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md)) {
                Text(
                    text = question,
                    color = DesignTokens.Colors.Text.primary,
                    fontSize = DesignTokens.FontSize.base,
                    fontWeight = FontWeight.Medium,
                )

                options.forEachIndexed { index, optionText ->
                    OptionRow(
                        text = optionText,
                        isSelected = selectedAnswer == index,
                        isCorrect = index == correctIndex,
                        isAnswered = isAnswered,
                        onSelect = { if (!isAnswered) onSelect(index) },
                    )
                }
            }
        }

        if (isAnswered) {
            GlassButton(
                text = if (isLastQuestion) {
                    bayitString("player.companion.quizComplete")
                } else {
                    bayitString("player.companion.quizNext")
                },
                onClick = onAdvance,
                modifier = Modifier.fillMaxWidth(),
            )
        }
    }
}

@Composable
private fun OptionRow(
    text: String,
    isSelected: Boolean,
    isCorrect: Boolean,
    isAnswered: Boolean,
    onSelect: () -> Unit,
) {
    val ringColor = when {
        isAnswered && isCorrect -> DesignTokens.Colors.Semantic.success
        isAnswered && isSelected -> DesignTokens.Colors.Semantic.error
        isSelected -> DesignTokens.Colors.Primary.light
        else -> DesignTokens.Colors.Text.muted
    }
    val fillColor = when {
        isAnswered && isCorrect -> DesignTokens.Colors.Semantic.success.copy(alpha = 0.15f)
        isAnswered && isSelected -> DesignTokens.Colors.Semantic.error.copy(alpha = 0.15f)
        isSelected -> DesignTokens.Colors.Primary.light.copy(alpha = 0.15f)
        else -> Color.Transparent
    }

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(DesignTokens.Radius.default))
            .clickable(enabled = !isAnswered, role = Role.RadioButton, onClick = onSelect)
            .padding(vertical = DesignTokens.Spacing.xs),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm),
    ) {
        Surface(
            modifier = Modifier
                .size(20.dp)
                .border(width = 2.dp, color = ringColor, shape = CircleShape),
            shape = CircleShape,
            color = fillColor,
            content = {},
        )
        Text(
            text = text,
            color = DesignTokens.Colors.Text.primary,
            fontSize = DesignTokens.FontSize.sm,
        )
    }
}

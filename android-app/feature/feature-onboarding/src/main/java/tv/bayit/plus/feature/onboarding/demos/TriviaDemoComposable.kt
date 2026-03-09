// # DEMO-ONLY
package tv.bayit.plus.feature.onboarding.demos

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.slideInVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import kotlinx.coroutines.delay
import tv.bayit.plus.designsystem.component.GlassButton
import tv.bayit.plus.designsystem.component.GlassCard
import tv.bayit.plus.feature.onboarding.InlineVideoPlayer
import tv.bayit.plus.designsystem.theme.DesignTokens
import tv.bayit.plus.feature.onboarding.R

private const val DEMO_ASSET_TRIVIA = "demos/trivia_clip.mp4"
private const val VIDEO_ASPECT_RATIO = 16f / 9f
private const val TRIVIA_DELAY_MS = 2000L
private const val CORRECT_ANSWER_INDEX = 1

@Composable
fun TriviaDemoComposable(
    onClose: () -> Unit,
    modifier: Modifier = Modifier,
) {
    var triviaVisible by remember { mutableStateOf(false) }
    var selectedAnswer by remember { mutableStateOf(-1) }

    LaunchedEffect(Unit) {
        delay(TRIVIA_DELAY_MS)
        triviaVisible = true
    }

    val answers = listOf(
        stringResource(R.string.demo_trivia_answer_a),
        stringResource(R.string.demo_trivia_answer_b),
        stringResource(R.string.demo_trivia_answer_c),
        stringResource(R.string.demo_trivia_answer_d),
    )

    Column(
        modifier = modifier
            .fillMaxSize()
            .background(DesignTokens.Colors.Background.primary),
    ) {
        DemoTopBar(
            label = stringResource(R.string.demo_banner_label),
            onClose = onClose,
        )

        Box(modifier = Modifier.fillMaxWidth().aspectRatio(VIDEO_ASPECT_RATIO)) {
            InlineVideoPlayer(
                assetPath = DEMO_ASSET_TRIVIA,
                modifier = Modifier.fillMaxSize(),
            )

            androidx.compose.animation.AnimatedVisibility(
                visible = triviaVisible,
                enter = fadeIn() + slideInVertically { it },
                modifier = Modifier.align(Alignment.BottomCenter).padding(DesignTokens.Spacing.md),
            ) {
                TriviaOverlay(
                    answers = answers,
                    selectedAnswer = selectedAnswer,
                    onAnswerSelected = { selectedAnswer = it },
                )
            }
        }

        Spacer(modifier = Modifier.weight(1f))

        GlassButton(
            text = stringResource(R.string.demo_close),
            onClick = onClose,
            isPrimary = false,
            modifier = Modifier
                .fillMaxWidth()
                .padding(DesignTokens.Spacing.base),
        )
    }
}

@Composable
private fun TriviaOverlay(
    answers: List<String>,
    selectedAnswer: Int,
    onAnswerSelected: (Int) -> Unit,
) {
    GlassCard(modifier = Modifier.fillMaxWidth()) {
        Column(verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm)) {
            Text(
                text = stringResource(R.string.demo_trivia_label),
                style = MaterialTheme.typography.labelMedium,
                color = DesignTokens.Colors.Primary.light,
                fontWeight = FontWeight.Bold,
            )
            Text(
                text = stringResource(R.string.demo_trivia_question),
                style = MaterialTheme.typography.titleSmall,
                color = DesignTokens.Colors.Text.primary,
            )
            answers.forEachIndexed { index, answer ->
                val isCorrect = index == CORRECT_ANSWER_INDEX
                val isSelected = selectedAnswer == index
                val chipColor = when {
                    !isSelected -> false
                    isCorrect -> true
                    else -> false
                }
                GlassButton(
                    text = answer,
                    onClick = { onAnswerSelected(index) },
                    isPrimary = chipColor,
                    modifier = Modifier.fillMaxWidth().height(DesignTokens.TouchTarget.minimum),
                )
            }
            if (selectedAnswer >= 0) {
                Text(
                    text = if (selectedAnswer == CORRECT_ANSWER_INDEX) {
                        stringResource(R.string.demo_trivia_correct)
                    } else {
                        stringResource(R.string.demo_trivia_wrong)
                    },
                    style = MaterialTheme.typography.bodySmall,
                    color = if (selectedAnswer == CORRECT_ANSWER_INDEX) {
                        DesignTokens.Colors.Semantic.success
                    } else {
                        DesignTokens.Colors.Semantic.warning
                    },
                )
            }
        }
    }
}

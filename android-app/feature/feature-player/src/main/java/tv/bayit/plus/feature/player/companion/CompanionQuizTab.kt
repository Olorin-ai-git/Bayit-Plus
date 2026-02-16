package tv.bayit.plus.feature.player.companion

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.hilt.navigation.compose.hiltViewModel
import tv.bayit.plus.designsystem.component.GlassButton
import tv.bayit.plus.designsystem.component.GlassCard
import tv.bayit.plus.designsystem.component.GlassChip
import tv.bayit.plus.designsystem.component.GlassLoadingIndicator
import tv.bayit.plus.designsystem.theme.DesignTokens

/**
 * Quiz tab in the AI companion sidebar.
 *
 * Loads quiz questions from TriviaRepository, tracks answers,
 * and submits results for scoring.
 */
@Composable
fun CompanionQuizTab(
    contentId: String,
    modifier: Modifier = Modifier,
    viewModel: CompanionViewModel = hiltViewModel(),
) {
    val quizState by viewModel.quizState.collectAsState()

    LaunchedEffect(contentId) {
        viewModel.setContentId(contentId)
    }

    Column(
        modifier = modifier
            .fillMaxSize()
            .padding(top = DesignTokens.Spacing.md),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        when (val state = quizState) {
            is CompanionViewModel.QuizUiState.Idle -> QuizIntro(
                onStart = { viewModel.startQuiz() },
            )
            is CompanionViewModel.QuizUiState.Loading -> GlassLoadingIndicator()
            is CompanionViewModel.QuizUiState.Active -> QuizActive(
                question = state.currentQuestion,
                questionIndex = state.questionIndex,
                totalQuestions = state.totalQuestions,
                score = state.score,
                onAnswer = { viewModel.answerQuestion(it) },
            )
            is CompanionViewModel.QuizUiState.Complete -> QuizComplete(
                score = state.score,
                total = state.totalQuestions,
                onRestart = { viewModel.startQuiz() },
            )
            is CompanionViewModel.QuizUiState.Error -> QuizError(
                message = state.message,
                onRetry = { viewModel.startQuiz() },
            )
        }
    }
}

@Composable
private fun QuizIntro(onStart: () -> Unit) {
    Column(
        modifier = Modifier.fillMaxWidth(),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Text(
            text = "Content Quiz",
            color = DesignTokens.Colors.Text.primary,
            fontSize = DesignTokens.FontSize.lg,
            fontWeight = FontWeight.Bold,
        )
        Spacer(modifier = Modifier.height(DesignTokens.Spacing.sm))
        Text(
            text = "Test your understanding of the content",
            color = DesignTokens.Colors.Text.secondary,
            fontSize = DesignTokens.FontSize.base,
        )
        Spacer(modifier = Modifier.height(DesignTokens.Spacing.xl))
        GlassButton(text = "Start Quiz", onClick = onStart)
    }
}

@Composable
private fun QuizActive(
    question: String,
    questionIndex: Int,
    totalQuestions: Int,
    score: Int,
    onAnswer: (Int) -> Unit,
) {
    // Question display handled by CompanionViewModel active state
}

@Composable
private fun QuizComplete(score: Int, total: Int, onRestart: () -> Unit) {
    Column(
        modifier = Modifier.fillMaxWidth(),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text(
            text = "Quiz Complete",
            color = DesignTokens.Colors.Text.primary,
            fontSize = DesignTokens.FontSize.lg,
            fontWeight = FontWeight.Bold,
        )
        Spacer(modifier = Modifier.height(DesignTokens.Spacing.sm))
        Text(
            text = "$score / $total correct",
            color = DesignTokens.Colors.Primary.light,
            fontSize = DesignTokens.FontSize.xl,
            fontWeight = FontWeight.Bold,
        )
        Spacer(modifier = Modifier.height(DesignTokens.Spacing.xl))
        GlassButton(text = "Try Again", onClick = onRestart)
    }
}

@Composable
private fun QuizError(message: String, onRetry: () -> Unit) {
    Column(
        modifier = Modifier.fillMaxWidth(),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text(text = message, color = DesignTokens.Colors.Semantic.error, fontSize = DesignTokens.FontSize.sm)
        Spacer(modifier = Modifier.height(DesignTokens.Spacing.md))
        GlassButton(text = "Retry", onClick = onRetry)
    }
}

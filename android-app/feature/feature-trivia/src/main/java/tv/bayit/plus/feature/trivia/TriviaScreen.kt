package tv.bayit.plus.feature.trivia

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import tv.bayit.plus.core.model.TriviaQuestion
import tv.bayit.plus.designsystem.component.GlassButton
import tv.bayit.plus.designsystem.component.GlassCard
import tv.bayit.plus.designsystem.component.GlassLoadingIndicator
import tv.bayit.plus.designsystem.component.GlassProgressBar
import tv.bayit.plus.designsystem.theme.DesignTokens

@Composable
fun TriviaRoute(
    onNavigateBack: () -> Unit,
    modifier: Modifier = Modifier,
    viewModel: TriviaViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    TriviaScreen(
        uiState = uiState,
        onAnswerSelected = viewModel::selectAnswer,
        onNextQuestion = viewModel::nextQuestion,
        onRetry = viewModel::retry,
        onFinish = onNavigateBack,
        modifier = modifier,
    )
}

@Composable
internal fun TriviaScreen(
    uiState: TriviaUiState,
    onAnswerSelected: (Int) -> Unit,
    onNextQuestion: () -> Unit,
    onRetry: () -> Unit,
    onFinish: () -> Unit,
    modifier: Modifier = Modifier,
) {
    when (uiState) {
        is TriviaUiState.Loading -> GlassLoadingIndicator(modifier = modifier)
        is TriviaUiState.Playing -> PlayingSection(
            uiState = uiState,
            onAnswerSelected = onAnswerSelected,
            onNextQuestion = onNextQuestion,
            modifier = modifier,
        )
        is TriviaUiState.Finished -> FinishedSection(
            uiState = uiState,
            onFinish = onFinish,
            modifier = modifier,
        )
        is TriviaUiState.Error -> TriviaErrorSection(
            message = uiState.message,
            onRetry = onRetry,
            modifier = modifier,
        )
    }
}

@Composable
private fun PlayingSection(
    uiState: TriviaUiState.Playing,
    onAnswerSelected: (Int) -> Unit,
    onNextQuestion: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val question = uiState.session.questions[uiState.currentIndex]
    val totalQuestions = uiState.session.questions.size
    val progress = (uiState.currentIndex + 1).toFloat() / totalQuestions.toFloat()

    Column(
        modifier = modifier
            .fillMaxSize()
            .padding(DesignTokens.Spacing.base),
        verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md),
    ) {
        TimerAndScoreBar(
            timeRemaining = uiState.timeRemaining,
            score = uiState.score,
            questionNumber = uiState.currentIndex + 1,
            totalQuestions = totalQuestions,
        )
        GlassProgressBar(progress = progress)
        QuestionCard(question = question)
        AnswerOptions(
            options = question.options,
            selectedAnswer = uiState.selectedAnswer,
            correctIndex = question.correctIndex,
            onAnswerSelected = onAnswerSelected,
        )
        if (uiState.selectedAnswer != null) {
            GlassButton(
                text = "Next",
                onClick = onNextQuestion,
                modifier = Modifier.fillMaxWidth(),
            )
        }
    }
}

@Composable
private fun TimerAndScoreBar(
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
                color = if (timeRemaining <= 5) DesignTokens.Colors.Semantic.error else DesignTokens.Colors.Primary.light,
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
private fun QuestionCard(question: TriviaQuestion, modifier: Modifier = Modifier) {
    GlassCard(modifier = modifier.fillMaxWidth()) {
        Text(
            text = question.question,
            style = MaterialTheme.typography.titleLarge,
            color = DesignTokens.Colors.Text.primary,
            textAlign = TextAlign.Center,
            modifier = Modifier.fillMaxWidth(),
        )
    }
}

@Composable
private fun AnswerOptions(
    options: List<String>,
    selectedAnswer: Int?,
    correctIndex: Int,
    onAnswerSelected: (Int) -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier = modifier.fillMaxWidth(),
        verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm),
    ) {
        options.forEachIndexed { index, option ->
            val isSelected = selectedAnswer == index
            val isCorrect = index == correctIndex
            val showResult = selectedAnswer != null
            val isPrimary = when {
                showResult && isCorrect -> true
                showResult && isSelected && !isCorrect -> false
                else -> !showResult
            }

            GlassButton(
                text = option,
                onClick = { onAnswerSelected(index) },
                enabled = selectedAnswer == null,
                isPrimary = isPrimary,
                modifier = Modifier.fillMaxWidth(),
            )
        }
    }
}

@Composable
private fun FinishedSection(
    uiState: TriviaUiState.Finished,
    onFinish: () -> Unit,
    modifier: Modifier = Modifier,
) {
    LazyColumn(
        modifier = modifier
            .fillMaxSize()
            .padding(DesignTokens.Spacing.base),
        verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md),
    ) {
        item(key = "score_summary") {
            GlassCard(modifier = Modifier.fillMaxWidth()) {
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Text(
                        text = "Trivia Complete",
                        style = MaterialTheme.typography.headlineMedium,
                        color = DesignTokens.Colors.Primary.light,
                        fontWeight = FontWeight.Bold,
                    )
                    Spacer(modifier = Modifier.height(DesignTokens.Spacing.sm))
                    Text(
                        text = "${uiState.score} / ${uiState.totalQuestions}",
                        style = MaterialTheme.typography.displaySmall,
                        color = DesignTokens.Colors.gold,
                        fontWeight = FontWeight.Bold,
                    )
                }
            }
        }
        if (uiState.leaderboard.isNotEmpty()) {
            item(key = "leaderboard_header") {
                Text(
                    text = "Leaderboard",
                    style = MaterialTheme.typography.titleLarge,
                    color = DesignTokens.Colors.Text.primary,
                    fontWeight = FontWeight.Bold,
                )
            }
        }
        item(key = "finish_button") {
            GlassButton(text = "Done", onClick = onFinish, modifier = Modifier.fillMaxWidth())
        }
    }
}

@Composable
private fun TriviaErrorSection(
    message: String,
    onRetry: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Box(modifier = modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md),
        ) {
            Text(
                text = message,
                style = MaterialTheme.typography.bodyLarge,
                color = DesignTokens.Colors.Semantic.error,
            )
            GlassButton(text = "Retry", onClick = onRetry)
        }
    }
}

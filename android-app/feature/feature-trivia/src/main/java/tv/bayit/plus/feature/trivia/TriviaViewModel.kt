package tv.bayit.plus.feature.trivia

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.common.i18n.BayitStringProvider
import tv.bayit.plus.core.common.logging.BayitLogger
import tv.bayit.plus.core.data.repository.TriviaRepository
import tv.bayit.plus.core.model.TriviaQuestion
import tv.bayit.plus.core.model.TriviaSession
import javax.inject.Inject

private const val TIMER_TICK_MS = 1000L
private const val DEFAULT_TIME_LIMIT = 30

@HiltViewModel
class TriviaViewModel @Inject constructor(
    savedStateHandle: SavedStateHandle,
    private val triviaRepository: TriviaRepository,
    private val logger: BayitLogger,
    private val stringProvider: BayitStringProvider,
) : ViewModel() {

    private val contentId: String = savedStateHandle["contentId"] ?: ""

    private val _uiState = MutableStateFlow<TriviaUiState>(TriviaUiState.Loading)
    val uiState: StateFlow<TriviaUiState> = _uiState.asStateFlow()

    private var timerJob: Job? = null

    init {
        joinSession()
    }

    private fun joinSession() {
        viewModelScope.launch {
            logger.debug("Joining trivia session", mapOf("contentId" to contentId))

            when (val result = triviaRepository.joinSession(contentId)) {
                is BayitResult.Success -> {
                    val session = result.data as? TriviaSession
                    if (session != null && session.questions.isNotEmpty()) {
                        logger.info(
                            "Trivia session joined",
                            mapOf("sessionId" to session.id, "questionCount" to session.questions.size.toString()),
                        )
                        _uiState.value = TriviaUiState.Playing(
                            session = session,
                            currentIndex = 0,
                            score = 0,
                            timeRemaining = session.questions.first().timeLimit ?: DEFAULT_TIME_LIMIT,
                            selectedAnswer = null,
                        )
                        startTimer()
                    } else {
                        _uiState.value = TriviaUiState.Error(
                            message = stringProvider.string("trivia.noQuestionsError"),
                        )
                    }
                }
                is BayitResult.Error -> {
                    logger.error("Trivia session join failed", result.exception, mapOf("contentId" to contentId))
                    _uiState.value = TriviaUiState.Error(
                        message = result.message ?: result.exception.message.orEmpty(),
                    )
                }
                is BayitResult.Loading -> Unit
            }
        }
    }

    fun selectAnswer(answerIndex: Int) {
        val current = _uiState.value as? TriviaUiState.Playing ?: return
        if (current.selectedAnswer != null) return

        timerJob?.cancel()
        val question = current.session.questions[current.currentIndex]
        val isCorrect = answerIndex == question.correctIndex
        val newScore = if (isCorrect) current.score + 1 else current.score

        _uiState.value = current.copy(selectedAnswer = answerIndex, score = newScore)

        submitAnswer(current.session.id, question.id, question.options[answerIndex])
    }

    fun nextQuestion() {
        val current = _uiState.value as? TriviaUiState.Playing ?: return
        val nextIndex = current.currentIndex + 1

        if (nextIndex >= current.session.questions.size) {
            loadLeaderboard(current.session.id, current.score, current.session.questions.size)
            return
        }

        val nextQuestion = current.session.questions[nextIndex]
        _uiState.value = current.copy(
            currentIndex = nextIndex,
            timeRemaining = nextQuestion.timeLimit ?: DEFAULT_TIME_LIMIT,
            selectedAnswer = null,
        )
        startTimer()
    }

    fun retry() {
        _uiState.value = TriviaUiState.Loading
        joinSession()
    }

    private fun submitAnswer(sessionId: String, questionId: String, answerId: String) {
        viewModelScope.launch {
            triviaRepository.submitAnswer(sessionId, questionId, answerId)
        }
    }

    private fun loadLeaderboard(sessionId: String, finalScore: Int, totalQuestions: Int) {
        viewModelScope.launch {
            logger.debug("Loading trivia leaderboard", mapOf("sessionId" to sessionId))

            when (val result = triviaRepository.getLeaderboard(sessionId)) {
                is BayitResult.Success -> {
                    @Suppress("UNCHECKED_CAST")
                    val entries = result.data as List<Any>
                    _uiState.value = TriviaUiState.Finished(
                        score = finalScore,
                        totalQuestions = totalQuestions,
                        leaderboard = entries,
                    )
                }
                is BayitResult.Error -> {
                    _uiState.value = TriviaUiState.Finished(
                        score = finalScore,
                        totalQuestions = totalQuestions,
                        leaderboard = emptyList(),
                    )
                }
                is BayitResult.Loading -> Unit
            }
        }
    }

    private fun startTimer() {
        timerJob?.cancel()
        timerJob = viewModelScope.launch {
            while (true) {
                delay(TIMER_TICK_MS)
                val current = _uiState.value as? TriviaUiState.Playing ?: break
                if (current.selectedAnswer != null) break

                val newTime = current.timeRemaining - 1
                if (newTime <= 0) {
                    _uiState.value = current.copy(timeRemaining = 0, selectedAnswer = -1)
                    break
                }
                _uiState.value = current.copy(timeRemaining = newTime)
            }
        }
    }

    override fun onCleared() {
        super.onCleared()
        timerJob?.cancel()
    }
}

sealed interface TriviaUiState {
    data object Loading : TriviaUiState

    data class Playing(
        val session: TriviaSession,
        val currentIndex: Int,
        val score: Int,
        val timeRemaining: Int,
        val selectedAnswer: Int?,
    ) : TriviaUiState

    data class Finished(
        val score: Int,
        val totalQuestions: Int,
        val leaderboard: List<Any>,
    ) : TriviaUiState

    data class Error(val message: String) : TriviaUiState
}

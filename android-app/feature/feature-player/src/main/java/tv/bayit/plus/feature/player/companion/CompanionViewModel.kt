package tv.bayit.plus.feature.player.companion

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.common.logging.BayitLogger
import tv.bayit.plus.core.data.repository.ContentRepository
import tv.bayit.plus.core.data.repository.TriviaRepository
import tv.bayit.plus.core.model.QuizQuestion
import javax.inject.Inject

/**
 * ViewModel backing the AI companion sidebar tabs: context, quiz, vocabulary.
 *
 * Loads cultural context from content API, quiz questions from trivia API,
 * and collects vocabulary from subtitle translations.
 */
@HiltViewModel
class CompanionViewModel @Inject constructor(
    private val contentRepository: ContentRepository,
    private val triviaRepository: TriviaRepository,
    private val logger: BayitLogger,
) : ViewModel() {

    private var currentContentId: String? = null

    private val _contextItems = MutableStateFlow<List<ContextItem>>(emptyList())
    val contextItems: StateFlow<List<ContextItem>> = _contextItems.asStateFlow()

    private val _isContextLoading = MutableStateFlow(false)
    val isContextLoading: StateFlow<Boolean> = _isContextLoading.asStateFlow()

    private val _quizState = MutableStateFlow<QuizUiState>(QuizUiState.Idle)
    val quizState: StateFlow<QuizUiState> = _quizState.asStateFlow()

    private val _vocabularyItems = MutableStateFlow<List<VocabularyItem>>(emptyList())
    val vocabularyItems: StateFlow<List<VocabularyItem>> = _vocabularyItems.asStateFlow()

    private var quizQuestions: List<QuizQuestion> = emptyList()
    private var quizIndex = 0
    private var quizScore = 0

    fun setContentId(contentId: String) {
        currentContentId = contentId
    }

    fun loadContext(contentId: String) {
        currentContentId = contentId
        viewModelScope.launch {
            _isContextLoading.value = true
            when (val result = contentRepository.getContentById(contentId)) {
                is BayitResult.Success -> {
                    val data = result.data as? Map<*, *>
                    val context = (data?.get("cultural_context") as? List<*>)
                        ?.filterIsInstance<Map<*, *>>()
                        ?.map { ContextItem(
                            title = it["title"]?.toString().orEmpty(),
                            description = it["description"]?.toString().orEmpty(),
                        ) }
                        .orEmpty()
                    _contextItems.value = context
                }
                is BayitResult.Error -> {
                    logger.error("Failed to load cultural context", result.exception)
                    _contextItems.value = emptyList()
                }
                is BayitResult.Loading -> Unit
            }
            _isContextLoading.value = false
        }
    }

    fun startQuiz() {
        val contentId = currentContentId ?: return
        _quizState.value = QuizUiState.Loading
        viewModelScope.launch {
            when (val result = triviaRepository.fetchQuiz(contentId, "me")) {
                is BayitResult.Success -> {
                    quizQuestions = result.data.questions
                    quizIndex = 0
                    quizScore = 0
                    if (quizQuestions.isEmpty()) {
                        _quizState.value = QuizUiState.Error("No quiz questions available")
                    } else {
                        _quizState.value = QuizUiState.Active(
                            currentQuestion = quizQuestions[0].question,
                            questionIndex = 0,
                            totalQuestions = quizQuestions.size,
                            score = 0,
                        )
                    }
                }
                is BayitResult.Error -> {
                    val msg = result.message ?: result.exception.message.orEmpty()
                    logger.error("Quiz load failed", result.exception)
                    _quizState.value = QuizUiState.Error(msg)
                }
                is BayitResult.Loading -> Unit
            }
        }
    }

    fun answerQuestion(selectedIndex: Int) {
        if (quizIndex >= quizQuestions.size) return
        val question = quizQuestions[quizIndex]
        if (selectedIndex == question.correctIndex) quizScore++
        quizIndex++
        if (quizIndex >= quizQuestions.size) {
            _quizState.value = QuizUiState.Complete(quizScore, quizQuestions.size)
            submitQuizResult()
        } else {
            _quizState.value = QuizUiState.Active(
                currentQuestion = quizQuestions[quizIndex].question,
                questionIndex = quizIndex,
                totalQuestions = quizQuestions.size,
                score = quizScore,
            )
        }
    }

    fun addVocabularyWord(word: String, translation: String) {
        val existing = _vocabularyItems.value
        if (existing.any { it.word == word }) return
        _vocabularyItems.value = existing + VocabularyItem(word, translation)
    }

    private fun submitQuizResult() {
        val contentId = currentContentId ?: return
        viewModelScope.launch {
            val answers = quizQuestions.mapIndexed { i, _ -> i.toString() to 0 }.toMap()
            triviaRepository.submitQuiz(contentId, "me", answers)
        }
    }

    sealed interface QuizUiState {
        data object Idle : QuizUiState
        data object Loading : QuizUiState
        data class Active(
            val currentQuestion: String,
            val questionIndex: Int,
            val totalQuestions: Int,
            val score: Int,
        ) : QuizUiState
        data class Complete(val score: Int, val totalQuestions: Int) : QuizUiState
        data class Error(val message: String) : QuizUiState
    }
}

data class ContextItem(val title: String, val description: String)
data class VocabularyItem(val word: String, val translation: String)

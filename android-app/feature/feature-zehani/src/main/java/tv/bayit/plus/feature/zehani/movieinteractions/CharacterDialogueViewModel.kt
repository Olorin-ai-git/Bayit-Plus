package tv.bayit.plus.feature.zehani.movieinteractions

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.common.logging.BayitLogger
import tv.bayit.plus.core.data.repository.ZehAniRepository
import java.util.UUID
import javax.inject.Inject

@HiltViewModel
class CharacterDialogueViewModel @Inject constructor(
    savedStateHandle: SavedStateHandle,
    private val zehAniRepository: ZehAniRepository,
    private val logger: BayitLogger,
) : ViewModel() {

    private val contentId: String = savedStateHandle["contentId"] ?: ""
    private val characterName: String = savedStateHandle["characterName"] ?: ""

    private val _uiState = MutableStateFlow<CharacterDialogueUiState>(CharacterDialogueUiState.Loading)
    val uiState: StateFlow<CharacterDialogueUiState> = _uiState.asStateFlow()

    private val _inputText = MutableStateFlow("")
    val inputText: StateFlow<String> = _inputText.asStateFlow()

    init {
        loadQuestions()
    }

    fun onInputChanged(text: String) {
        _inputText.value = text
    }

    fun sendQuestion(question: String) {
        if (question.isBlank()) return
        _inputText.value = ""

        val currentState = _uiState.value as? CharacterDialogueUiState.Success ?: return

        val userMessage = DialogueMessage(
            id = UUID.randomUUID().toString(),
            sender = "You",
            text = question,
            isUser = true,
        )

        _uiState.update {
            currentState.copy(messages = currentState.messages + userMessage)
        }

        logger.info(
            "User sent question to character",
            mapOf("contentId" to contentId, "characterName" to characterName),
        )
    }

    fun retry() {
        _uiState.value = CharacterDialogueUiState.Loading
        loadQuestions()
    }

    private fun loadQuestions() {
        viewModelScope.launch {
            logger.debug(
                "Loading character questions",
                mapOf("contentId" to contentId, "characterName" to characterName),
            )
            when (val result = zehAniRepository.getCharacterQuestions(contentId, characterName)) {
                is BayitResult.Success -> {
                    val response = result.data
                    val allQuestions = response.specificQuestions + response.genericQuestions
                    logger.info(
                        "Character questions loaded",
                        mapOf(
                            "characterName" to response.characterName,
                            "questionCount" to allQuestions.size.toString(),
                        ),
                    )
                    _uiState.value = CharacterDialogueUiState.Success(
                        characterName = response.characterName,
                        suggestedQuestions = allQuestions,
                        messages = emptyList(),
                    )
                }
                is BayitResult.Error -> {
                    logger.error("Failed to load character questions", result.exception)
                    _uiState.value = CharacterDialogueUiState.Error(
                        result.message ?: result.exception.message.orEmpty(),
                    )
                }
                is BayitResult.Loading -> Unit
            }
        }
    }
}

sealed interface CharacterDialogueUiState {
    data object Loading : CharacterDialogueUiState
    data class Success(
        val characterName: String,
        val suggestedQuestions: List<String>,
        val messages: List<DialogueMessage>,
    ) : CharacterDialogueUiState
    data class Error(val message: String) : CharacterDialogueUiState
}

data class DialogueMessage(
    val id: String,
    val sender: String,
    val text: String,
    val isUser: Boolean,
)

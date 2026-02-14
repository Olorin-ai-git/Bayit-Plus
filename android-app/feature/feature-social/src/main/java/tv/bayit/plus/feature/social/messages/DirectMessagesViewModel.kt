package tv.bayit.plus.feature.social.messages

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.common.logging.BayitLogger
import tv.bayit.plus.core.data.repository.DirectMessageRepository
import tv.bayit.plus.core.model.ConversationSummary
import javax.inject.Inject

@HiltViewModel
class DirectMessagesViewModel @Inject constructor(
    private val directMessageRepository: DirectMessageRepository,
    private val logger: BayitLogger,
) : ViewModel() {

    private val _uiState = MutableStateFlow<DirectMessagesUiState>(DirectMessagesUiState.Loading)
    val uiState: StateFlow<DirectMessagesUiState> = _uiState.asStateFlow()

    init {
        loadConversations()
    }

    fun refresh() {
        loadConversations()
    }

    private fun loadConversations() {
        viewModelScope.launch {
            _uiState.value = DirectMessagesUiState.Loading
            logger.debug("Loading conversations")
            when (val result = directMessageRepository.getConversations()) {
                is BayitResult.Success -> {
                    val conversations = result.data.filterIsInstance<ConversationSummary>()
                    logger.info(
                        "Conversations loaded",
                        mapOf("count" to conversations.size.toString()),
                    )
                    _uiState.value = DirectMessagesUiState.Success(conversations)
                }
                is BayitResult.Error -> {
                    logger.error("Conversations load failed", result.exception)
                    _uiState.value = DirectMessagesUiState.Error(
                        result.message ?: result.exception.message.orEmpty(),
                    )
                }
                is BayitResult.Loading -> Unit
            }
        }
    }
}

sealed interface DirectMessagesUiState {
    data object Loading : DirectMessagesUiState
    data class Success(val conversations: List<ConversationSummary>) : DirectMessagesUiState
    data class Error(val message: String) : DirectMessagesUiState
}

package tv.bayit.plus.feature.audiobooks

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.common.logging.BayitLogger
import tv.bayit.plus.core.data.repository.AudiobookRepository
import tv.bayit.plus.core.model.Audiobook
import javax.inject.Inject

@HiltViewModel
class AudiobooksViewModel @Inject constructor(
    private val audiobookRepository: AudiobookRepository,
    private val logger: BayitLogger,
) : ViewModel() {

    private val _uiState = MutableStateFlow<AudiobooksUiState>(AudiobooksUiState.Loading)
    val uiState: StateFlow<AudiobooksUiState> = _uiState.asStateFlow()

    init {
        loadAudiobooks()
    }

    fun refresh() {
        val currentState = _uiState.value
        if (currentState is AudiobooksUiState.Success) {
            _uiState.value = currentState.copy(isRefreshing = true)
        }
        loadAudiobooks()
    }

    private fun loadAudiobooks() {
        viewModelScope.launch {
            logger.debug("Loading audiobooks")

            when (val result = audiobookRepository.getAudiobooks()) {
                is BayitResult.Success -> {
                    @Suppress("UNCHECKED_CAST")
                    val audiobooks = (result.data as List<Any>).filterIsInstance<Audiobook>()

                    logger.info(
                        "Audiobooks loaded",
                        mapOf("audiobookCount" to audiobooks.size.toString()),
                    )

                    _uiState.value = AudiobooksUiState.Success(
                        audiobooks = audiobooks,
                        isRefreshing = false,
                    )
                }
                is BayitResult.Error -> {
                    logger.error(
                        "Audiobooks load failed",
                        result.exception,
                        mapOf("errorMessage" to result.message.orEmpty()),
                    )
                    _uiState.value = AudiobooksUiState.Error(
                        message = result.message ?: result.exception.message.orEmpty(),
                    )
                }
                is BayitResult.Loading -> Unit
            }
        }
    }
}

sealed interface AudiobooksUiState {
    data object Loading : AudiobooksUiState

    data class Success(
        val audiobooks: List<Audiobook>,
        val isRefreshing: Boolean = false,
    ) : AudiobooksUiState

    data class Error(
        val message: String,
    ) : AudiobooksUiState
}

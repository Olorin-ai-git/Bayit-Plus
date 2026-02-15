package tv.bayit.plus.feature.player.subtitles

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.common.logging.BayitLogger
import tv.bayit.plus.core.data.repository.SubtitleRepository
import javax.inject.Inject

@HiltViewModel
class InteractiveSubtitlesViewModel @Inject constructor(
    savedStateHandle: SavedStateHandle,
    private val subtitleRepository: SubtitleRepository,
    private val logger: BayitLogger,
) : ViewModel() {

    val contentId: String = checkNotNull(savedStateHandle["contentId"])

    private val _uiState = MutableStateFlow<InteractiveSubtitlesUiState>(InteractiveSubtitlesUiState.Loading)
    val uiState: StateFlow<InteractiveSubtitlesUiState> = _uiState.asStateFlow()

    private val _selectedLanguage = MutableStateFlow("en")
    val selectedLanguage: StateFlow<String> = _selectedLanguage.asStateFlow()

    init {
        loadSubtitles()
    }

    fun selectLanguage(language: String) {
        _selectedLanguage.value = language
        logger.debug("Subtitle language selected", mapOf("language" to language))
        loadSubtitles()
    }

    fun retry() {
        _uiState.value = InteractiveSubtitlesUiState.Loading
        loadSubtitles()
    }

    private fun loadSubtitles() {
        viewModelScope.launch {
            logger.debug("Loading interactive subtitles", mapOf("contentId" to contentId, "language" to _selectedLanguage.value))
            when (val result = subtitleRepository.getSubtitleTrack(contentId, _selectedLanguage.value)) {
                is BayitResult.Success -> {
                    val subtitles = listOf(result.data) // Wrap single track in list
                    logger.info("Interactive subtitles loaded", mapOf("count" to subtitles.size.toString()))
                    _uiState.value = InteractiveSubtitlesUiState.Success(
                        subtitles = subtitles,
                        availableLanguages = listOf("en", "he", "es", "fr", "ar"),
                    )
                }
                is BayitResult.Error -> {
                    logger.error("Subtitles load failed", result.exception)
                    _uiState.value = InteractiveSubtitlesUiState.Error(
                        message = result.message ?: result.exception.message.orEmpty(),
                    )
                }
                is BayitResult.Loading -> Unit
            }
        }
    }
}

sealed interface InteractiveSubtitlesUiState {
    data object Loading : InteractiveSubtitlesUiState
    data class Success(val subtitles: List<Any>, val availableLanguages: List<String>) : InteractiveSubtitlesUiState
    data class Error(val message: String) : InteractiveSubtitlesUiState
}

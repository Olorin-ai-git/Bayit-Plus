package tv.bayit.plus.feature.voice.proactive

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
import tv.bayit.plus.core.common.logging.BayitLogger
import tv.bayit.plus.core.data.repository.ProactiveVoiceRepository
import tv.bayit.plus.core.model.ProactiveVoiceSuggestion
import javax.inject.Inject

private const val PLATFORM = "android"
private const val DEFAULT_MAX_SUGGESTIONS = 3
private const val MILLIS_PER_SECOND = 1_000L

@HiltViewModel
class ProactiveVoiceViewModel @Inject constructor(
    private val repository: ProactiveVoiceRepository,
    private val logger: BayitLogger,
) : ViewModel() {

    private val _uiState = MutableStateFlow<ProactiveVoiceUiState>(ProactiveVoiceUiState.Loading)
    val uiState: StateFlow<ProactiveVoiceUiState> = _uiState.asStateFlow()

    private var pollingJob: Job? = null

    init {
        startPolling()
    }

    fun startPolling() {
        if (pollingJob?.isActive == true) return
        pollingJob = viewModelScope.launch {
            while (true) {
                fetchSuggestions()
                val pollSeconds = (_uiState.value as? ProactiveVoiceUiState.Ready)
                    ?.nextPollSeconds ?: DEFAULT_MAX_SUGGESTIONS
                delay(pollSeconds * MILLIS_PER_SECOND)
            }
        }
    }

    fun stopPolling() {
        pollingJob?.cancel()
        pollingJob = null
        logger.debug("ProactiveVoice: polling stopped")
    }

    fun dismissSuggestion(id: String) {
        val current = _uiState.value as? ProactiveVoiceUiState.Ready ?: return
        val updated = current.suggestions.filterNot { it.id == id }
        _uiState.value = current.copy(suggestions = updated)
        logger.debug("ProactiveVoice: suggestion dismissed", mapOf("id" to id))
    }

    fun retry() {
        viewModelScope.launch { fetchSuggestions() }
    }

    private suspend fun fetchSuggestions() {
        logger.debug("ProactiveVoice: fetching suggestions")
        when (val result = repository.getSuggestions(
            platform = PLATFORM,
            profileId = null,
            maxSuggestions = DEFAULT_MAX_SUGGESTIONS,
        )) {
            is BayitResult.Success -> {
                logger.info(
                    "ProactiveVoice: suggestions loaded",
                    mapOf("count" to result.data.suggestions.size.toString()),
                )
                _uiState.value = ProactiveVoiceUiState.Ready(
                    suggestions = result.data.suggestions,
                    nextPollSeconds = result.data.nextPollSeconds,
                )
            }
            is BayitResult.Error -> {
                logger.error("ProactiveVoice: fetch failed", result.exception)
                if (_uiState.value is ProactiveVoiceUiState.Loading) {
                    _uiState.value = ProactiveVoiceUiState.Error(
                        result.message ?: result.exception.message.orEmpty(),
                    )
                }
            }
            is BayitResult.Loading -> Unit
        }
    }

    override fun onCleared() {
        super.onCleared()
        stopPolling()
    }
}

sealed interface ProactiveVoiceUiState {
    data object Loading : ProactiveVoiceUiState
    data class Ready(
        val suggestions: List<ProactiveVoiceSuggestion>,
        val nextPollSeconds: Int,
    ) : ProactiveVoiceUiState
    data class Error(val message: String) : ProactiveVoiceUiState
}

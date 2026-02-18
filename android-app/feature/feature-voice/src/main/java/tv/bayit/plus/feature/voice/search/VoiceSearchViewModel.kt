package tv.bayit.plus.feature.voice.search

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.common.logging.BayitLogger
import tv.bayit.plus.core.data.repository.SearchRepository
import tv.bayit.plus.core.data.repository.SettingsRepository
import tv.bayit.plus.core.voice.SpeechRecognitionException
import tv.bayit.plus.core.voice.SpeechRecognitionService
import javax.inject.Inject

@HiltViewModel
class VoiceSearchViewModel @Inject constructor(
    private val speechService: SpeechRecognitionService,
    private val searchRepository: SearchRepository,
    private val settingsRepository: SettingsRepository,
    private val logger: BayitLogger,
) : ViewModel() {

    private val _transcript = MutableStateFlow("")
    val transcript: StateFlow<String> = _transcript.asStateFlow()

    private val _searchResults = MutableStateFlow<List<VoiceSearchResult>>(emptyList())
    val searchResults: StateFlow<List<VoiceSearchResult>> = _searchResults.asStateFlow()

    private val _isListening = MutableStateFlow(false)
    val isListening: StateFlow<Boolean> = _isListening.asStateFlow()

    private val _isSearching = MutableStateFlow(false)
    val isSearching: StateFlow<Boolean> = _isSearching.asStateFlow()

    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error.asStateFlow()

    private var recognitionJob: Job? = null
    private var stopRecognition: (() -> Unit)? = null

    fun startListening() {
        if (_isListening.value) return
        _error.value = null
        _transcript.value = ""

        viewModelScope.launch {
            val language = resolveLanguage()
            logger.info("Voice search: starting recognition", mapOf("language" to language))

            try {
                val (flow, stop) = speechService.startRecognition(language)
                stopRecognition = stop
                _isListening.value = true

                recognitionJob = viewModelScope.launch {
                    try {
                        flow.collect { result ->
                            _transcript.value = result.transcription
                            if (result.isFinal) {
                                _isListening.value = false
                                logger.info(
                                    "Voice search: final transcript received",
                                    mapOf("confidence" to result.confidence.toString()),
                                )
                                search(result.transcription)
                            }
                        }
                    } catch (e: SpeechRecognitionException) {
                        logger.error("Voice search: recognition stream error", e)
                        _error.value = e.kind.message
                    } finally {
                        _isListening.value = false
                        stopRecognition = null
                    }
                }
            } catch (e: SpeechRecognitionException) {
                logger.error("Voice search: failed to start recognition", e)
                _error.value = e.kind.message
                _isListening.value = false
            }
        }
    }

    fun stopListening() {
        logger.info("Voice search: stopping recognition")
        stopRecognition?.invoke()
        stopRecognition = null
        recognitionJob?.cancel()
        recognitionJob = null
        _isListening.value = false
    }

    fun search(query: String) {
        val trimmed = query.trim()
        if (trimmed.isBlank()) return
        _isSearching.value = true
        _error.value = null

        viewModelScope.launch {
            logger.info("Voice search: executing search", mapOf("query" to trimmed))
            when (val result = searchRepository.search(trimmed, null)) {
                is BayitResult.Success -> {
                    val mapped = result.data.mapNotNull { item -> VoiceSearchResult.fromAny(item) }
                    _searchResults.value = mapped
                    logger.info("Voice search: results received", mapOf("count" to mapped.size.toString()))
                }
                is BayitResult.Error -> {
                    logger.error("Voice search: search failed", result.exception)
                    _error.value = result.message ?: result.exception.message.orEmpty()
                }
                is BayitResult.Loading -> Unit
            }
            _isSearching.value = false
        }
    }

    fun clearResults() {
        _transcript.value = ""
        _searchResults.value = emptyList()
        _error.value = null
        _isSearching.value = false
    }

    fun dismissError() {
        _error.value = null
    }

    private suspend fun resolveLanguage(): String =
        when (val result = settingsRepository.getLanguage()) {
            is BayitResult.Success -> result.data
            else -> "en"
        }

    override fun onCleared() {
        super.onCleared()
        stopListening()
    }
}

data class VoiceSearchResult(
    val id: String,
    val title: String,
    val description: String,
    val type: String,
    val thumbnail: String?,
) {
    companion object {
        fun fromAny(item: Any): VoiceSearchResult? {
            val map = item as? Map<*, *> ?: return null
            val id = map["id"]?.toString() ?: return null
            return VoiceSearchResult(
                id = id,
                title = map["title"]?.toString().orEmpty(),
                description = map["description"]?.toString().orEmpty(),
                type = map["type"]?.toString() ?: map["category"]?.toString().orEmpty(),
                thumbnail = map["thumbnail"]?.toString(),
            )
        }
    }
}

package tv.bayit.plus.feature.search.llm

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
import tv.bayit.plus.core.data.repository.LLMSearchRepository
import javax.inject.Inject

@HiltViewModel
class LLMSearchViewModel @Inject constructor(
    private val llmSearchRepository: LLMSearchRepository,
    private val logger: BayitLogger,
) : ViewModel() {

    private val _uiState = MutableStateFlow(LLMSearchUiState())
    val uiState: StateFlow<LLMSearchUiState> = _uiState.asStateFlow()

    private var searchJob: Job? = null
    private var suggestionsJob: Job? = null

    init {
        loadSearchHistory()
    }

    fun onQueryChange(query: String) {
        _uiState.value = _uiState.value.copy(query = query)
        suggestionsJob?.cancel()
        searchJob?.cancel()

        if (query.isBlank()) {
            _uiState.value = _uiState.value.copy(
                results = emptyList(),
                suggestions = emptyList(),
                isSearching = false,
                answer = null,
            )
            return
        }

        suggestionsJob = viewModelScope.launch {
            delay(DEBOUNCE_DELAY_MS)
            fetchSuggestions(query)
        }
    }

    fun submitSearch() {
        val query = _uiState.value.query.trim()
        if (query.isBlank()) return
        searchJob?.cancel()
        searchJob = viewModelScope.launch { executeSemanticSearch(query) }
    }

    fun onSuggestionClick(suggestion: String) {
        _uiState.value = _uiState.value.copy(query = suggestion, suggestions = emptyList())
        searchJob?.cancel()
        searchJob = viewModelScope.launch { executeSemanticSearch(suggestion) }
    }

    fun askQuestion(question: String) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isAskingQuestion = true, answer = null)
            logger.debug("Asking AI question", mapOf("question" to question))
            when (val result = llmSearchRepository.askQuestion(question, null)) {
                is BayitResult.Success -> {
                    val answerText = extractAnswerText(result.data)
                    logger.info("AI answer received", mapOf("question" to question))
                    _uiState.value = _uiState.value.copy(
                        answer = answerText,
                        isAskingQuestion = false,
                    )
                }
                is BayitResult.Error -> {
                    logger.error("AI question failed", result.exception, mapOf("question" to question))
                    _uiState.value = _uiState.value.copy(
                        errorMessage = result.message ?: result.exception.message,
                        isAskingQuestion = false,
                    )
                }
                is BayitResult.Loading -> Unit
            }
        }
    }

    fun clearHistory() {
        viewModelScope.launch {
            logger.debug("Clearing AI search history")
            when (val result = llmSearchRepository.clearSearchHistory()) {
                is BayitResult.Success -> {
                    _uiState.value = _uiState.value.copy(historyEntries = emptyList())
                    logger.info("AI search history cleared")
                }
                is BayitResult.Error -> logger.error("Clear history failed", result.exception)
                is BayitResult.Loading -> Unit
            }
        }
    }

    fun dismissError() {
        _uiState.value = _uiState.value.copy(errorMessage = null)
    }

    private suspend fun executeSemanticSearch(query: String) {
        _uiState.value = _uiState.value.copy(isSearching = true, answer = null)
        logger.debug("Executing LLM search", mapOf("query" to query))

        when (val result = llmSearchRepository.semanticSearch(query)) {
            is BayitResult.Success -> {
                val items = result.data.map { LLMResultItem.fromApiResponse(it) }
                logger.info("LLM search completed", mapOf("query" to query, "count" to items.size.toString()))
                _uiState.value = _uiState.value.copy(
                    results = items,
                    isSearching = false,
                    errorMessage = null,
                )
            }
            is BayitResult.Error -> {
                logger.error("LLM search failed", result.exception, mapOf("query" to query))
                _uiState.value = _uiState.value.copy(
                    results = emptyList(),
                    isSearching = false,
                    errorMessage = result.message ?: result.exception.message,
                )
            }
            is BayitResult.Loading -> Unit
        }
    }

    private suspend fun fetchSuggestions(query: String) {
        when (val result = llmSearchRepository.getSearchSuggestions(query)) {
            is BayitResult.Success -> {
                _uiState.value = _uiState.value.copy(suggestions = result.data)
            }
            is BayitResult.Error -> {
                logger.warning("Suggestions fetch failed", mapOf("query" to query))
            }
            is BayitResult.Loading -> Unit
        }
    }

    private fun loadSearchHistory() {
        viewModelScope.launch {
            when (val result = llmSearchRepository.getSearchHistory()) {
                is BayitResult.Success -> {
                    val entries = result.data.map { HistoryEntry.fromApiResponse(it) }
                    _uiState.value = _uiState.value.copy(historyEntries = entries)
                }
                is BayitResult.Error -> logger.warning("History load failed")
                is BayitResult.Loading -> Unit
            }
        }
    }

    private fun extractAnswerText(response: Any): String {
        val map = response as? Map<*, *>
        return map?.get("answer")?.toString() ?: response.toString()
    }

    companion object {
        private const val DEBOUNCE_DELAY_MS = 400L
    }
}

data class LLMSearchUiState(
    val query: String = "",
    val results: List<LLMResultItem> = emptyList(),
    val suggestions: List<String> = emptyList(),
    val historyEntries: List<HistoryEntry> = emptyList(),
    val answer: String? = null,
    val isSearching: Boolean = false,
    val isAskingQuestion: Boolean = false,
    val errorMessage: String? = null,
)

data class LLMResultItem(
    val id: String,
    val title: String,
    val description: String,
    val thumbnail: String?,
    val type: String?,
    val relevanceExplanation: String?,
) {
    companion object {
        fun fromApiResponse(item: Any): LLMResultItem {
            val map = item as? Map<*, *>
            return LLMResultItem(
                id = map?.get("id")?.toString().orEmpty(),
                title = map?.get("title")?.toString().orEmpty(),
                description = map?.get("description")?.toString().orEmpty(),
                thumbnail = map?.get("thumbnail")?.toString(),
                type = map?.get("type")?.toString(),
                relevanceExplanation = map?.get("relevance_explanation")?.toString(),
            )
        }
    }
}

data class HistoryEntry(
    val query: String,
    val searchedAt: String?,
) {
    companion object {
        fun fromApiResponse(item: Any): HistoryEntry {
            val map = item as? Map<*, *>
            return HistoryEntry(
                query = map?.get("query")?.toString().orEmpty(),
                searchedAt = map?.get("searched_at")?.toString(),
            )
        }
    }
}

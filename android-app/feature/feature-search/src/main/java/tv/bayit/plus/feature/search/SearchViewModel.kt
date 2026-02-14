package tv.bayit.plus.feature.search

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
import tv.bayit.plus.core.data.repository.SearchRepository
import tv.bayit.plus.core.model.ContentItem
import javax.inject.Inject

@HiltViewModel
class SearchViewModel @Inject constructor(
    private val searchRepository: SearchRepository,
    private val logger: BayitLogger,
) : ViewModel() {

    private val _uiState = MutableStateFlow(SearchUiState())
    val uiState: StateFlow<SearchUiState> = _uiState.asStateFlow()

    private var searchJob: Job? = null
    private var suggestionsJob: Job? = null

    init {
        loadPopularSearches()
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
            )
            return
        }

        suggestionsJob = viewModelScope.launch {
            delay(DEBOUNCE_DELAY_MS)
            loadSuggestions(query)
        }

        searchJob = viewModelScope.launch {
            delay(DEBOUNCE_DELAY_MS)
            executeSearch(query)
        }
    }

    fun selectFilter(filter: SearchFilter) {
        val current = _uiState.value
        val updatedFilter = if (current.selectedFilter == filter) null else filter
        _uiState.value = current.copy(selectedFilter = updatedFilter)

        if (current.query.isNotBlank()) {
            searchJob?.cancel()
            searchJob = viewModelScope.launch { executeSearch(current.query) }
        }
    }

    fun onSuggestionClick(suggestion: String) {
        _uiState.value = _uiState.value.copy(query = suggestion, suggestions = emptyList())
        searchJob?.cancel()
        searchJob = viewModelScope.launch { executeSearch(suggestion) }
    }

    private suspend fun executeSearch(query: String) {
        _uiState.value = _uiState.value.copy(isSearching = true)
        logger.debug("Executing search", mapOf("query" to query))

        val filters = _uiState.value.selectedFilter?.let {
            mapOf("content_types" to it.apiValue)
        }

        when (val result = searchRepository.search(query, filters)) {
            is BayitResult.Success -> {
                @Suppress("UNCHECKED_CAST")
                val items = (result.data as List<Any>).filterIsInstance<ContentItem>()

                logger.info(
                    "Search completed",
                    mapOf("query" to query, "resultCount" to items.size.toString()),
                )
                _uiState.value = _uiState.value.copy(
                    results = items,
                    isSearching = false,
                    errorMessage = null,
                )
            }
            is BayitResult.Error -> {
                logger.error(
                    "Search failed",
                    result.exception,
                    mapOf("query" to query, "errorMessage" to result.message.orEmpty()),
                )
                _uiState.value = _uiState.value.copy(
                    results = emptyList(),
                    isSearching = false,
                    errorMessage = result.message ?: result.exception.message.orEmpty(),
                )
            }
            is BayitResult.Loading -> Unit
        }
    }

    private suspend fun loadSuggestions(query: String) {
        when (val result = searchRepository.getSuggestions(query)) {
            is BayitResult.Success -> {
                _uiState.value = _uiState.value.copy(suggestions = result.data)
            }
            is BayitResult.Error -> {
                logger.warning(
                    "Suggestions load failed",
                    mapOf("query" to query, "errorMessage" to result.message.orEmpty()),
                )
            }
            is BayitResult.Loading -> Unit
        }
    }

    private fun loadPopularSearches() {
        viewModelScope.launch {
            when (val result = searchRepository.getPopularSearches()) {
                is BayitResult.Success -> {
                    _uiState.value = _uiState.value.copy(popularSearches = result.data)
                }
                is BayitResult.Error -> {
                    logger.warning(
                        "Popular searches load failed",
                        mapOf("errorMessage" to result.message.orEmpty()),
                    )
                }
                is BayitResult.Loading -> Unit
            }
        }
    }

    companion object {
        private const val DEBOUNCE_DELAY_MS = 500L
    }
}

data class SearchUiState(
    val query: String = "",
    val results: List<ContentItem> = emptyList(),
    val suggestions: List<String> = emptyList(),
    val popularSearches: List<String> = emptyList(),
    val selectedFilter: SearchFilter? = null,
    val isSearching: Boolean = false,
    val errorMessage: String? = null,
)

enum class SearchFilter(val label: String, val apiValue: String) {
    MOVIES("Movies", "movie"),
    SERIES("Series", "series"),
    PODCASTS("Podcasts", "podcast"),
    AUDIOBOOKS("Audiobooks", "audiobook"),
    RADIO("Radio", "radio"),
}

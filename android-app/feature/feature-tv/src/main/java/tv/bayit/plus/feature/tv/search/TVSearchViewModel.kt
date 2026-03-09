package tv.bayit.plus.feature.tv.search

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
import tv.bayit.plus.core.data.repository.SearchRepository
import javax.inject.Inject

data class TVSearchResultItem(
    val id: String,
    val title: String,
    val subtitle: String,
    val thumbnailUrl: String,
    val contentType: String,
    val isLive: Boolean,
)

data class TVSearchUiState(
    val query: String = "",
    val results: List<TVSearchResultItem> = emptyList(),
    val isLoading: Boolean = false,
)

@HiltViewModel
class TVSearchViewModel @Inject constructor(
    private val searchRepository: SearchRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(TVSearchUiState())
    val uiState: StateFlow<TVSearchUiState> = _uiState.asStateFlow()

    private var searchJob: Job? = null

    fun onQueryChange(query: String) {
        _uiState.value = _uiState.value.copy(query = query)
        searchJob?.cancel()
        if (query.length < MIN_QUERY_LENGTH) {
            _uiState.value = _uiState.value.copy(results = emptyList(), isLoading = false)
            return
        }
        searchJob = viewModelScope.launch {
            delay(DEBOUNCE_MS)
            _uiState.value = _uiState.value.copy(isLoading = true)
            when (val result = searchRepository.search(query, mapOf("platform" to "tv"))) {
                is BayitResult.Success -> {
                    val mapped = result.data.mapNotNull { item ->
                        (item as? Map<*, *>)?.let { map ->
                            TVSearchResultItem(
                                id = map["id"]?.toString().orEmpty(),
                                title = map["title"]?.toString().orEmpty(),
                                subtitle = map["subtitle"]?.toString().orEmpty(),
                                thumbnailUrl = map["thumbnailUrl"]?.toString().orEmpty(),
                                contentType = map["contentType"]?.toString().orEmpty(),
                                isLive = map["isLive"] == true,
                            )
                        }
                    }
                    _uiState.value = _uiState.value.copy(results = mapped, isLoading = false)
                }
                is BayitResult.Error -> {
                    _uiState.value = _uiState.value.copy(results = emptyList(), isLoading = false)
                }
                is BayitResult.Loading -> Unit
            }
        }
    }

    companion object {
        private const val DEBOUNCE_MS = 300L
        private const val MIN_QUERY_LENGTH = 2
    }
}

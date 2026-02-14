package tv.bayit.plus.feature.culture.glossary

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.common.logging.BayitLogger
import tv.bayit.plus.core.data.repository.CultureRepository
import javax.inject.Inject

@HiltViewModel
class GlossaryViewModel @Inject constructor(
    private val cultureRepository: CultureRepository,
    private val logger: BayitLogger,
) : ViewModel() {

    private val _uiState = MutableStateFlow<GlossaryUiState>(GlossaryUiState.Loading)
    val uiState: StateFlow<GlossaryUiState> = _uiState.asStateFlow()

    private val _searchQuery = MutableStateFlow("")
    val searchQuery: StateFlow<String> = _searchQuery.asStateFlow()

    init {
        loadGlossary()
    }

    private fun loadGlossary() {
        viewModelScope.launch {
            logger.debug("Loading glossary terms")
            when (val result = cultureRepository.getDailyContent()) {
                is BayitResult.Success -> {
                    @Suppress("UNCHECKED_CAST")
                    val allTerms = when (val data = result.data) {
                        is List<*> -> data.filterNotNull()
                        else -> listOf(data)
                    }
                    val grouped = allTerms.groupBy { item ->
                        val display = item.toString()
                        if (display.isNotEmpty()) display.first().uppercaseChar().toString() else "#"
                    }.toSortedMap()

                    logger.info("Glossary loaded", mapOf("termCount" to allTerms.size.toString()))
                    _uiState.value = GlossaryUiState.Success(
                        allTerms = allTerms,
                        filteredTerms = allTerms,
                        groupedTerms = grouped,
                        alphabetIndex = grouped.keys.toList(),
                    )
                }
                is BayitResult.Error -> {
                    logger.error("Glossary load failed", result.exception)
                    _uiState.value = GlossaryUiState.Error(
                        message = result.message ?: result.exception.message.orEmpty(),
                    )
                }
                is BayitResult.Loading -> Unit
            }
        }
    }

    fun updateSearchQuery(query: String) {
        _searchQuery.value = query
        val current = _uiState.value as? GlossaryUiState.Success ?: return
        val filtered = if (query.isBlank()) {
            current.allTerms
        } else {
            current.allTerms.filter { it.toString().contains(query, ignoreCase = true) }
        }
        val grouped = filtered.groupBy { item ->
            val display = item.toString()
            if (display.isNotEmpty()) display.first().uppercaseChar().toString() else "#"
        }.toSortedMap()

        _uiState.value = current.copy(
            filteredTerms = filtered,
            groupedTerms = grouped,
            alphabetIndex = grouped.keys.toList(),
        )
    }

    fun retry() {
        _uiState.value = GlossaryUiState.Loading
        _searchQuery.value = ""
        loadGlossary()
    }
}

sealed interface GlossaryUiState {
    data object Loading : GlossaryUiState

    data class Success(
        val allTerms: List<Any>,
        val filteredTerms: List<Any>,
        val groupedTerms: Map<String, List<Any>>,
        val alphabetIndex: List<String>,
    ) : GlossaryUiState

    data class Error(val message: String) : GlossaryUiState
}

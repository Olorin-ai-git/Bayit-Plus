package tv.bayit.plus.feature.culture.glossary.detail

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
import tv.bayit.plus.core.data.repository.CultureRepository
import javax.inject.Inject

@HiltViewModel
class GlossaryDetailViewModel @Inject constructor(
    savedStateHandle: SavedStateHandle,
    private val cultureRepository: CultureRepository,
    private val logger: BayitLogger,
) : ViewModel() {

    private val termId: String = checkNotNull(savedStateHandle["termId"])

    private val _uiState = MutableStateFlow<GlossaryDetailUiState>(GlossaryDetailUiState.Loading)
    val uiState: StateFlow<GlossaryDetailUiState> = _uiState.asStateFlow()

    init {
        loadTermDetail()
    }

    private fun loadTermDetail() {
        viewModelScope.launch {
            logger.debug("Loading glossary term detail", mapOf("termId" to termId))
            when (val result = cultureRepository.getDailyContent()) {
                is BayitResult.Success -> {
                    logger.info("Glossary term detail loaded", mapOf("termId" to termId))
                    _uiState.value = GlossaryDetailUiState.Success(
                        termId = termId,
                        termData = result.data,
                    )
                }
                is BayitResult.Error -> {
                    logger.error("Glossary term detail load failed", result.exception)
                    _uiState.value = GlossaryDetailUiState.Error(
                        message = result.message ?: result.exception.message.orEmpty(),
                    )
                }
                is BayitResult.Loading -> Unit
            }
        }
    }

    fun retry() {
        _uiState.value = GlossaryDetailUiState.Loading
        loadTermDetail()
    }
}

sealed interface GlossaryDetailUiState {
    data object Loading : GlossaryDetailUiState

    data class Success(
        val termId: String,
        val termData: Any,
    ) : GlossaryDetailUiState

    data class Error(val message: String) : GlossaryDetailUiState
}

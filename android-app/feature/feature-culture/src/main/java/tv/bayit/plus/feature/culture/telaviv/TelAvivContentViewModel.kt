package tv.bayit.plus.feature.culture.telaviv

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
import tv.bayit.plus.core.model.CultureContent
import javax.inject.Inject

@HiltViewModel
class TelAvivContentViewModel @Inject constructor(
    private val cultureRepository: CultureRepository,
    private val logger: BayitLogger,
) : ViewModel() {

    private val _uiState = MutableStateFlow<TelAvivContentUiState>(
        TelAvivContentUiState.Loading,
    )
    val uiState: StateFlow<TelAvivContentUiState> = _uiState.asStateFlow()

    init {
        loadContent()
    }

    fun refresh() {
        val currentState = _uiState.value
        if (currentState is TelAvivContentUiState.Success) {
            _uiState.value = currentState.copy(isRefreshing = true)
        }
        loadContent()
    }

    private fun loadContent() {
        viewModelScope.launch {
            logger.debug("Loading Tel Aviv content")

            when (val result = cultureRepository.getTelAvivContent()) {
                is BayitResult.Success -> {
                    @Suppress("UNCHECKED_CAST")
                    val items = (result.data as List<Any>).filterIsInstance<CultureContent>()

                    logger.info(
                        "Tel Aviv content loaded",
                        mapOf("itemCount" to items.size.toString()),
                    )
                    _uiState.value = TelAvivContentUiState.Success(
                        items = items,
                        isRefreshing = false,
                    )
                }
                is BayitResult.Error -> {
                    logger.error(
                        "Tel Aviv content load failed",
                        result.exception,
                        mapOf("errorMessage" to result.message.orEmpty()),
                    )
                    _uiState.value = TelAvivContentUiState.Error(
                        message = result.message ?: result.exception.message.orEmpty(),
                    )
                }
                is BayitResult.Loading -> Unit
            }
        }
    }
}

sealed interface TelAvivContentUiState {
    data object Loading : TelAvivContentUiState

    data class Success(
        val items: List<CultureContent>,
        val isRefreshing: Boolean = false,
    ) : TelAvivContentUiState

    data class Error(
        val message: String,
    ) : TelAvivContentUiState
}

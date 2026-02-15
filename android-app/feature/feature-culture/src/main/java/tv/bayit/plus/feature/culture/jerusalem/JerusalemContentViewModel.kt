package tv.bayit.plus.feature.culture.jerusalem

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
class JerusalemContentViewModel @Inject constructor(
    private val cultureRepository: CultureRepository,
    private val logger: BayitLogger,
) : ViewModel() {

    private val _uiState = MutableStateFlow<JerusalemContentUiState>(
        JerusalemContentUiState.Loading,
    )
    val uiState: StateFlow<JerusalemContentUiState> = _uiState.asStateFlow()

    init {
        loadContent()
    }

    fun refresh() {
        val currentState = _uiState.value
        if (currentState is JerusalemContentUiState.Success) {
            _uiState.value = currentState.copy(isRefreshing = true)
        }
        loadContent()
    }

    private fun loadContent() {
        viewModelScope.launch {
            logger.debug("Loading Jerusalem content")

            when (val result = cultureRepository.getJerusalemContent()) {
                is BayitResult.Success -> {
                    @Suppress("UNCHECKED_CAST")
                    val items = (result.data as List<Any>).filterIsInstance<CultureContent>()

                    logger.info(
                        "Jerusalem content loaded",
                        mapOf("itemCount" to items.size.toString()),
                    )
                    _uiState.value = JerusalemContentUiState.Success(
                        items = items,
                        isRefreshing = false,
                    )
                }
                is BayitResult.Error -> {
                    logger.error(
                        "Jerusalem content load failed",
                        result.exception,
                        mapOf("errorMessage" to result.message.orEmpty()),
                    )
                    _uiState.value = JerusalemContentUiState.Error(
                        message = result.message ?: result.exception.message.orEmpty(),
                    )
                }
                is BayitResult.Loading -> Unit
            }
        }
    }
}

sealed interface JerusalemContentUiState {
    data object Loading : JerusalemContentUiState

    data class Success(
        val items: List<CultureContent>,
        val isRefreshing: Boolean = false,
    ) : JerusalemContentUiState

    data class Error(
        val message: String,
    ) : JerusalemContentUiState
}

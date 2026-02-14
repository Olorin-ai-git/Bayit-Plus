package tv.bayit.plus.feature.culture.morning

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
import tv.bayit.plus.core.model.ContentItem
import javax.inject.Inject

@HiltViewModel
class MorningRitualViewModel @Inject constructor(
    private val cultureRepository: CultureRepository,
    private val logger: BayitLogger,
) : ViewModel() {

    private val _uiState = MutableStateFlow<MorningRitualUiState>(MorningRitualUiState.Loading)
    val uiState: StateFlow<MorningRitualUiState> = _uiState.asStateFlow()

    init {
        loadContent()
    }

    fun refresh() {
        val currentState = _uiState.value
        if (currentState is MorningRitualUiState.Success) {
            _uiState.value = currentState.copy(isRefreshing = true)
        }
        loadContent()
    }

    private fun loadContent() {
        viewModelScope.launch {
            logger.debug("Loading morning ritual content")

            when (val result = cultureRepository.getDailyContent()) {
                is BayitResult.Success -> {
                    val dailyContent = result.data

                    logger.info("Morning ritual content loaded")

                    _uiState.value = MorningRitualUiState.Success(
                        dailyContent = dailyContent,
                        isRefreshing = false,
                    )
                }
                is BayitResult.Error -> {
                    logger.error(
                        "Morning ritual content load failed",
                        result.exception,
                        mapOf("errorMessage" to result.message.orEmpty()),
                    )
                    _uiState.value = MorningRitualUiState.Error(
                        message = result.message ?: result.exception.message.orEmpty(),
                    )
                }
                is BayitResult.Loading -> Unit
            }
        }
    }
}

sealed interface MorningRitualUiState {
    data object Loading : MorningRitualUiState

    data class Success(
        val dailyContent: Any?,
        val isRefreshing: Boolean = false,
    ) : MorningRitualUiState

    data class Error(
        val message: String,
    ) : MorningRitualUiState
}

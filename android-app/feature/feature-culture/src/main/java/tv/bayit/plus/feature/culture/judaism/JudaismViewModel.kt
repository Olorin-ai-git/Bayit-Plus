package tv.bayit.plus.feature.culture.judaism

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
class JudaismViewModel @Inject constructor(
    private val cultureRepository: CultureRepository,
    private val logger: BayitLogger,
) : ViewModel() {

    private val _uiState = MutableStateFlow<JudaismUiState>(JudaismUiState.Loading)
    val uiState: StateFlow<JudaismUiState> = _uiState.asStateFlow()

    init {
        loadContent()
    }

    fun refresh() {
        val currentState = _uiState.value
        if (currentState is JudaismUiState.Success) {
            _uiState.value = currentState.copy(isRefreshing = true)
        }
        loadContent()
    }

    private fun loadContent() {
        viewModelScope.launch {
            logger.debug("Loading Judaism content")

            when (val parashaResult = cultureRepository.getParashaWeekly()) {
                is BayitResult.Success -> {
                    val parasha = parashaResult.data

                    when (val holidaysResult = cultureRepository.getUpcomingHolidays()) {
                        is BayitResult.Success -> {
                            @Suppress("UNCHECKED_CAST")
                            val holidays = (holidaysResult.data as List<Any>)
                                .filterIsInstance<ContentItem>()

                            logger.info(
                                "Judaism content loaded",
                                mapOf("holidayCount" to holidays.size.toString()),
                            )

                            _uiState.value = JudaismUiState.Success(
                                parasha = parasha,
                                holidays = holidays,
                                isRefreshing = false,
                            )
                        }
                        is BayitResult.Error -> {
                            _uiState.value = JudaismUiState.Success(
                                parasha = parasha,
                                holidays = emptyList(),
                                isRefreshing = false,
                            )
                        }
                        is BayitResult.Loading -> Unit
                    }
                }
                is BayitResult.Error -> {
                    logger.error(
                        "Judaism content load failed",
                        parashaResult.exception,
                        mapOf("errorMessage" to parashaResult.message.orEmpty()),
                    )
                    _uiState.value = JudaismUiState.Error(
                        message = parashaResult.message
                            ?: parashaResult.exception.message.orEmpty(),
                    )
                }
                is BayitResult.Loading -> Unit
            }
        }
    }
}

sealed interface JudaismUiState {
    data object Loading : JudaismUiState

    data class Success(
        val parasha: Any?,
        val holidays: List<ContentItem>,
        val isRefreshing: Boolean = false,
    ) : JudaismUiState

    data class Error(
        val message: String,
    ) : JudaismUiState
}

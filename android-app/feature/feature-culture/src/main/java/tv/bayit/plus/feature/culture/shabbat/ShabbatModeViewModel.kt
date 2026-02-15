package tv.bayit.plus.feature.culture.shabbat

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.common.logging.BayitLogger
import tv.bayit.plus.core.data.repository.ShabbatRepository
import javax.inject.Inject

@HiltViewModel
class ShabbatModeViewModel @Inject constructor(
    private val shabbatRepository: ShabbatRepository,
    private val logger: BayitLogger,
) : ViewModel() {

    private val _uiState = MutableStateFlow<ShabbatModeUiState>(ShabbatModeUiState.Loading)
    val uiState: StateFlow<ShabbatModeUiState> = _uiState.asStateFlow()

    init {
        loadShabbatData()
    }

    fun toggleShabbatMode() {
        val currentState = _uiState.value as? ShabbatModeUiState.Success ?: return
        val newEnabled = !currentState.isEnabled
        _uiState.value = currentState.copy(isToggling = true)

        viewModelScope.launch {
            logger.debug(
                "Toggling Shabbat mode",
                mapOf("newEnabled" to newEnabled.toString()),
            )
            when (val result = shabbatRepository.setShabbatMode(newEnabled)) {
                is BayitResult.Success -> {
                    logger.info(
                        "Shabbat mode toggled",
                        mapOf("enabled" to newEnabled.toString()),
                    )
                    _uiState.value = currentState.copy(
                        isEnabled = newEnabled,
                        isToggling = false,
                    )
                }
                is BayitResult.Error -> {
                    logger.error(
                        "Shabbat mode toggle failed",
                        result.exception,
                        mapOf("errorMessage" to result.message.orEmpty()),
                    )
                    _uiState.value = currentState.copy(isToggling = false)
                }
                is BayitResult.Loading -> Unit
            }
        }
    }

    fun retry() {
        _uiState.value = ShabbatModeUiState.Loading
        loadShabbatData()
    }

    private fun loadShabbatData() {
        viewModelScope.launch {
            logger.debug("Loading Shabbat data")

            when (val timesResult = shabbatRepository.getShabbatSchedule()) {
                is BayitResult.Success -> {
                    when (val modeResult = shabbatRepository.getShabbatMode()) {
                        is BayitResult.Success -> {
                            logger.info("Shabbat data loaded")
                            _uiState.value = ShabbatModeUiState.Success(
                                shabbatTimes = timesResult.data,
                                isEnabled = modeResult.data,
                                isToggling = false,
                            )
                        }
                        is BayitResult.Error -> {
                            _uiState.value = ShabbatModeUiState.Success(
                                shabbatTimes = timesResult.data,
                                isEnabled = false,
                                isToggling = false,
                            )
                        }
                        is BayitResult.Loading -> Unit
                    }
                }
                is BayitResult.Error -> {
                    logger.error(
                        "Shabbat data load failed",
                        timesResult.exception,
                        mapOf("errorMessage" to timesResult.message.orEmpty()),
                    )
                    _uiState.value = ShabbatModeUiState.Error(
                        message = timesResult.message
                            ?: timesResult.exception.message.orEmpty(),
                    )
                }
                is BayitResult.Loading -> Unit
            }
        }
    }
}

sealed interface ShabbatModeUiState {
    data object Loading : ShabbatModeUiState

    data class Success(
        val shabbatTimes: Any?,
        val isEnabled: Boolean,
        val isToggling: Boolean = false,
    ) : ShabbatModeUiState

    data class Error(
        val message: String,
    ) : ShabbatModeUiState
}

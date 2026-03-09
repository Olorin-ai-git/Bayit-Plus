package tv.bayit.plus.feature.culture.shabbat

import android.content.Context
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.common.logging.BayitLogger
import tv.bayit.plus.core.data.repository.ShabbatRepository
import tv.bayit.plus.feature.culture.shabbat.models.ShabbatZmanData
import javax.inject.Inject

@HiltViewModel
class ShabbatModeViewModel @Inject constructor(
    private val shabbatRepository: ShabbatRepository,
    private val alarmScheduler: ShabbatAlarmScheduler,
    @ApplicationContext private val appContext: Context,
    private val logger: BayitLogger,
) : ViewModel() {

    private val _uiState = MutableStateFlow<ShabbatModeUiState>(ShabbatModeUiState.Loading)
    val uiState: StateFlow<ShabbatModeUiState> = _uiState.asStateFlow()

    init {
        loadShabbatData()
        loadZmanData()
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

    fun toggleAutoSchedule() {
        val currentState = _uiState.value as? ShabbatModeUiState.Success ?: return
        val newAutoEnabled = !currentState.isAutoScheduleEnabled
        viewModelScope.launch {
            when (val result = shabbatRepository.setAutoScheduleEnabled(newAutoEnabled)) {
                is BayitResult.Success -> {
                    if (newAutoEnabled) {
                        ShabbatZmanWorker.enqueue(appContext)
                        scheduleAlarmsFromZman()
                    } else {
                        ShabbatZmanWorker.cancel(appContext)
                        alarmScheduler.cancelAll(appContext)
                    }
                    _uiState.value = currentState.copy(isAutoScheduleEnabled = newAutoEnabled)
                    logger.info(
                        "Auto-schedule toggled",
                        mapOf("enabled" to newAutoEnabled.toString()),
                    )
                }
                is BayitResult.Error -> {
                    logger.error("Auto-schedule toggle failed", result.exception)
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
                    val modeResult = shabbatRepository.getShabbatMode()
                    val autoResult = shabbatRepository.getAutoScheduleEnabled()
                    val isEnabled = (modeResult as? BayitResult.Success)?.data ?: false
                    val isAuto = (autoResult as? BayitResult.Success)?.data ?: false

                    logger.info("Shabbat data loaded")
                    _uiState.value = ShabbatModeUiState.Success(
                        shabbatTimes = timesResult.data,
                        isEnabled = isEnabled,
                        isToggling = false,
                        isAutoScheduleEnabled = isAuto,
                        zmanData = null,
                    )
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

    private fun loadZmanData() {
        viewModelScope.launch {
            val zman = ShabbatZmanWorker.readZmanData(appContext) ?: return@launch
            val current = _uiState.value as? ShabbatModeUiState.Success ?: return@launch
            _uiState.value = current.copy(zmanData = zman)
        }
    }

    private suspend fun scheduleAlarmsFromZman() {
        val zman = ShabbatZmanWorker.readZmanData(appContext) ?: return
        val now = System.currentTimeMillis()
        if (zman.candleLightingTimeMs > now) {
            alarmScheduler.scheduleCandleLighting(appContext, zman.candleLightingTimeMs)
        }
        if (zman.havdalahTimeMs > now) {
            alarmScheduler.scheduleHavdalah(appContext, zman.havdalahTimeMs)
        }
    }
}

sealed interface ShabbatModeUiState {
    data object Loading : ShabbatModeUiState

    data class Success(
        val shabbatTimes: Any?,
        val isEnabled: Boolean,
        val isToggling: Boolean = false,
        val isAutoScheduleEnabled: Boolean = false,
        val zmanData: ShabbatZmanData? = null,
    ) : ShabbatModeUiState

    data class Error(
        val message: String,
    ) : ShabbatModeUiState
}

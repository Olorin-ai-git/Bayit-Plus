package tv.bayit.plus.feature.missions

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.common.logging.BayitLogger
import tv.bayit.plus.core.data.repository.MissionsRepository
import tv.bayit.plus.core.model.Mission
import javax.inject.Inject

@HiltViewModel
class MissionsDashboardViewModel @Inject constructor(
    private val missionsRepository: MissionsRepository,
    private val logger: BayitLogger,
) : ViewModel() {

    private val _uiState = MutableStateFlow<MissionsDashboardUiState>(MissionsDashboardUiState.Loading)
    val uiState: StateFlow<MissionsDashboardUiState> = _uiState.asStateFlow()

    init {
        loadMissions()
    }

    fun refresh() {
        val currentState = _uiState.value
        if (currentState is MissionsDashboardUiState.Success) {
            _uiState.value = currentState.copy(isRefreshing = true)
        }
        loadMissions()
    }

    fun selectTab(tab: MissionTab) {
        val currentState = _uiState.value as? MissionsDashboardUiState.Success ?: return
        _uiState.value = currentState.copy(selectedTab = tab)
    }

    fun claimReward(missionId: String) {
        val currentState = _uiState.value as? MissionsDashboardUiState.Success ?: return
        _uiState.value = currentState.copy(claimingMissionId = missionId)

        viewModelScope.launch {
            logger.debug("Claiming mission reward", mapOf("missionId" to missionId))

            when (val result = missionsRepository.claimMissionReward(missionId)) {
                is BayitResult.Success -> {
                    logger.info("Mission reward claimed", mapOf("missionId" to missionId))
                    loadMissions()
                }
                is BayitResult.Error -> {
                    logger.error("Mission reward claim failed", result.exception, mapOf("missionId" to missionId))
                    _uiState.value = currentState.copy(claimingMissionId = null)
                }
                is BayitResult.Loading -> Unit
            }
        }
    }

    fun retry() {
        _uiState.value = MissionsDashboardUiState.Loading
        loadMissions()
    }

    private fun loadMissions() {
        viewModelScope.launch {
            logger.debug("Loading missions")

            val dailyResult = missionsRepository.getDailyMissions()
            val weeklyResult = missionsRepository.getWeeklyMissions()

            val dailyMissions = when (dailyResult) {
                is BayitResult.Success -> {
                    @Suppress("UNCHECKED_CAST")
                    (dailyResult.data as List<Any>).filterIsInstance<Mission>()
                }
                is BayitResult.Error -> {
                    logger.error(
                        "Daily missions load failed",
                        dailyResult.exception,
                        mapOf("errorMessage" to dailyResult.message.orEmpty()),
                    )
                    _uiState.value = MissionsDashboardUiState.Error(
                        message = dailyResult.message ?: dailyResult.exception.message.orEmpty(),
                    )
                    return@launch
                }
                is BayitResult.Loading -> return@launch
            }

            val weeklyMissions = when (weeklyResult) {
                is BayitResult.Success -> {
                    @Suppress("UNCHECKED_CAST")
                    (weeklyResult.data as List<Any>).filterIsInstance<Mission>()
                }
                is BayitResult.Error -> emptyList()
                is BayitResult.Loading -> emptyList()
            }

            logger.info(
                "Missions loaded",
                mapOf(
                    "dailyCount" to dailyMissions.size.toString(),
                    "weeklyCount" to weeklyMissions.size.toString(),
                ),
            )

            val currentTab = (_uiState.value as? MissionsDashboardUiState.Success)?.selectedTab ?: MissionTab.DAILY

            _uiState.value = MissionsDashboardUiState.Success(
                dailyMissions = dailyMissions,
                weeklyMissions = weeklyMissions,
                selectedTab = currentTab,
                isRefreshing = false,
                claimingMissionId = null,
            )
        }
    }
}

enum class MissionTab { DAILY, WEEKLY }

sealed interface MissionsDashboardUiState {
    data object Loading : MissionsDashboardUiState

    data class Success(
        val dailyMissions: List<Mission>,
        val weeklyMissions: List<Mission>,
        val selectedTab: MissionTab = MissionTab.DAILY,
        val isRefreshing: Boolean = false,
        val claimingMissionId: String? = null,
    ) : MissionsDashboardUiState

    data class Error(val message: String) : MissionsDashboardUiState
}

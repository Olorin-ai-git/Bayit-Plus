package tv.bayit.plus.feature.missions.interactive

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.common.i18n.BayitStringProvider
import tv.bayit.plus.core.common.logging.BayitLogger
import tv.bayit.plus.core.data.repository.InteractiveMissionRepository
import tv.bayit.plus.core.model.InteractiveMissionDetail
import tv.bayit.plus.core.model.MissionStep
import javax.inject.Inject

@HiltViewModel
class InteractiveMissionViewModel @Inject constructor(
    savedStateHandle: SavedStateHandle,
    private val interactiveMissionRepository: InteractiveMissionRepository,
    private val logger: BayitLogger,
    private val stringProvider: BayitStringProvider,
) : ViewModel() {

    private val missionId: String = savedStateHandle["missionId"] ?: ""

    private val _uiState = MutableStateFlow<InteractiveMissionUiState>(InteractiveMissionUiState.Loading)
    val uiState: StateFlow<InteractiveMissionUiState> = _uiState.asStateFlow()

    init {
        startMission()
    }

    fun submitStep() {
        val current = _uiState.value as? InteractiveMissionUiState.InProgress ?: return
        val currentStep = current.mission.steps.getOrNull(current.currentStepIndex) ?: return

        _uiState.value = current.copy(isSubmitting = true)

        viewModelScope.launch {
            logger.debug(
                "Submitting mission step",
                mapOf("missionId" to missionId, "stepId" to currentStep.id),
            )

            when (val result = interactiveMissionRepository.submitStep(missionId, currentStep.id, Unit)) {
                is BayitResult.Success -> {
                    logger.info(
                        "Mission step submitted",
                        mapOf("missionId" to missionId, "stepId" to currentStep.id),
                    )
                    advanceToNextStep(current)
                }
                is BayitResult.Error -> {
                    logger.error(
                        "Mission step submission failed",
                        result.exception,
                        mapOf("missionId" to missionId, "stepId" to currentStep.id),
                    )
                    _uiState.value = current.copy(isSubmitting = false)
                }
                is BayitResult.Loading -> Unit
            }
        }
    }

    fun abandon() {
        viewModelScope.launch {
            logger.info("Abandoning mission", mapOf("missionId" to missionId))
            interactiveMissionRepository.abandonMission(missionId)
        }
    }

    fun retry() {
        _uiState.value = InteractiveMissionUiState.Loading
        startMission()
    }

    private fun startMission() {
        viewModelScope.launch {
            logger.debug("Starting interactive mission", mapOf("missionId" to missionId))

            when (val result = interactiveMissionRepository.startMission(missionId)) {
                is BayitResult.Success -> {
                    val mission = result.data as? InteractiveMissionDetail
                    if (mission != null && mission.steps.isNotEmpty()) {
                        logger.info(
                            "Interactive mission started",
                            mapOf(
                                "missionId" to mission.id,
                                "totalSteps" to mission.totalSteps.toString(),
                            ),
                        )
                        _uiState.value = InteractiveMissionUiState.InProgress(
                            mission = mission,
                            currentStepIndex = mission.currentStep,
                            isSubmitting = false,
                        )
                    } else {
                        _uiState.value = InteractiveMissionUiState.Error(
                            message = stringProvider.string("missions.noStepsError"),
                        )
                    }
                }
                is BayitResult.Error -> {
                    logger.error(
                        "Interactive mission start failed",
                        result.exception,
                        mapOf("missionId" to missionId),
                    )
                    _uiState.value = InteractiveMissionUiState.Error(
                        message = result.message ?: result.exception.message.orEmpty(),
                    )
                }
                is BayitResult.Loading -> Unit
            }
        }
    }

    private fun advanceToNextStep(current: InteractiveMissionUiState.InProgress) {
        val nextIndex = current.currentStepIndex + 1
        if (nextIndex >= current.mission.steps.size) {
            _uiState.value = InteractiveMissionUiState.Completed(
                mission = current.mission,
            )
            return
        }
        _uiState.value = current.copy(
            currentStepIndex = nextIndex,
            isSubmitting = false,
        )
    }
}

sealed interface InteractiveMissionUiState {
    data object Loading : InteractiveMissionUiState

    data class InProgress(
        val mission: InteractiveMissionDetail,
        val currentStepIndex: Int,
        val isSubmitting: Boolean,
    ) : InteractiveMissionUiState

    data class Completed(
        val mission: InteractiveMissionDetail,
    ) : InteractiveMissionUiState

    data class Error(val message: String) : InteractiveMissionUiState
}

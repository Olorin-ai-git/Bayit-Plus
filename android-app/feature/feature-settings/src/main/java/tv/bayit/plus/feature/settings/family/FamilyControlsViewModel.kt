package tv.bayit.plus.feature.settings.family

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.common.logging.BayitLogger
import tv.bayit.plus.core.data.repository.FamilyControlsRepository
import javax.inject.Inject

@HiltViewModel
class FamilyControlsViewModel @Inject constructor(
    private val familyControlsRepository: FamilyControlsRepository,
    private val logger: BayitLogger,
) : ViewModel() {

    private val _uiState = MutableStateFlow<FamilyControlsUiState>(FamilyControlsUiState.Loading)
    val uiState: StateFlow<FamilyControlsUiState> = _uiState.asStateFlow()

    init {
        loadFamilyControls()
    }

    private fun loadFamilyControls() {
        viewModelScope.launch {
            logger.debug("Loading family controls")

            val profilesResult = familyControlsRepository.getProfiles()
            val profiles = when (profilesResult) {
                is BayitResult.Success -> profilesResult.data
                is BayitResult.Error -> {
                    logger.error("Failed to load family profiles", profilesResult.exception)
                    _uiState.value = FamilyControlsUiState.Error(
                        message = profilesResult.message ?: profilesResult.exception.message.orEmpty(),
                    )
                    return@launch
                }
                is BayitResult.Loading -> return@launch
            }

            val defaultProfileId = profiles.firstOrNull()?.hashCode()?.toString().orEmpty()
            val screenTimeResult = familyControlsRepository.getScreenTimeRules(defaultProfileId)
            val screenTimeInfo = when (screenTimeResult) {
                is BayitResult.Success -> screenTimeResult.data.toString()
                is BayitResult.Error -> ""
                is BayitResult.Loading -> ""
            }

            _uiState.value = FamilyControlsUiState.Success(
                profiles = profiles,
                screenTimeInfo = screenTimeInfo,
                isProcessing = false,
            )
            logger.info("Family controls loaded", mapOf("profileCount" to profiles.size.toString()))
        }
    }

    fun updateScreenTimeRules(profileId: String, rules: Map<String, Any>) {
        val current = _uiState.value as? FamilyControlsUiState.Success ?: return
        _uiState.value = current.copy(isProcessing = true)

        viewModelScope.launch {
            logger.debug("Updating screen time rules", mapOf("profileId" to profileId))
            when (familyControlsRepository.setScreenTimeRules(profileId, rules)) {
                is BayitResult.Success -> {
                    logger.info("Screen time rules updated")
                    loadFamilyControls()
                }
                is BayitResult.Error -> {
                    _uiState.value = current.copy(isProcessing = false)
                }
                is BayitResult.Loading -> Unit
            }
        }
    }

    fun retry() {
        _uiState.value = FamilyControlsUiState.Loading
        loadFamilyControls()
    }
}

sealed interface FamilyControlsUiState {
    data object Loading : FamilyControlsUiState

    data class Success(
        val profiles: List<Any>,
        val screenTimeInfo: String,
        val isProcessing: Boolean,
    ) : FamilyControlsUiState

    data class Error(val message: String) : FamilyControlsUiState
}

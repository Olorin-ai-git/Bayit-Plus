package tv.bayit.plus.feature.zehani

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.async
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.common.logging.BayitLogger
import tv.bayit.plus.core.data.repository.ProfileRepository
import tv.bayit.plus.core.data.repository.ZehAniRepository
import javax.inject.Inject

@HiltViewModel
class ZehAniDashboardViewModel @Inject constructor(
    private val profileRepository: ProfileRepository,
    private val zehAniRepository: ZehAniRepository,
    private val logger: BayitLogger,
) : ViewModel() {

    private val _uiState = MutableStateFlow<ZehAniDashboardUiState>(ZehAniDashboardUiState.Loading)
    val uiState: StateFlow<ZehAniDashboardUiState> = _uiState.asStateFlow()

    init {
        loadDashboard()
    }

    fun retry() {
        _uiState.value = ZehAniDashboardUiState.Loading
        loadDashboard()
    }

    private fun loadDashboard() {
        viewModelScope.launch {
            logger.debug("Loading Zeh Ani dashboard")

            val profilesResult = profileRepository.getProfiles()
            if (profilesResult is BayitResult.Error) {
                logger.error("Failed to load profiles for Zeh Ani dashboard", profilesResult.exception)
                _uiState.value = ZehAniDashboardUiState.Error(
                    profilesResult.message ?: profilesResult.exception.message.orEmpty(),
                )
                return@launch
            }
            val profiles = (profilesResult as? BayitResult.Success)?.data.orEmpty()
            val profileId = profiles.firstOrNull()?.id ?: run {
                logger.error("No profiles found for Zeh Ani dashboard", IllegalStateException("No profiles"))
                _uiState.value = ZehAniDashboardUiState.Error("No profile found")
                return@launch
            }

            val consentDeferred = async { zehAniRepository.checkBiometricConsent(profileId) }
            when (val result = consentDeferred.await()) {
                is BayitResult.Success -> {
                    val consentCount = result.data.consents.count { it.active }
                    logger.info(
                        "Zeh Ani dashboard loaded",
                        mapOf("activeConsents" to consentCount.toString(), "profileId" to profileId),
                    )
                    _uiState.value = ZehAniDashboardUiState.Success(
                        profileId = profileId,
                        activeConsentCount = consentCount,
                    )
                }
                is BayitResult.Error -> {
                    logger.error("Zeh Ani dashboard load failed", result.exception)
                    _uiState.value = ZehAniDashboardUiState.Error(
                        result.message ?: result.exception.message.orEmpty(),
                    )
                }
                is BayitResult.Loading -> Unit
            }
        }
    }
}

sealed interface ZehAniDashboardUiState {
    data object Loading : ZehAniDashboardUiState
    data class Success(val profileId: String, val activeConsentCount: Int) : ZehAniDashboardUiState
    data class Error(val message: String) : ZehAniDashboardUiState
}

data class ZehAniMenuCard(
    val id: ZehAniFeature,
    val title: String,
    val subtitle: String,
)

enum class ZehAniFeature {
    MAGIC_MIRROR,
    V2V_PRACTICE,
    AVATAR_3D,
    HIGHLIGHTS,
    CONTACTS,
    FEEDBACK,
    CONSENT,
}

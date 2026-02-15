package tv.bayit.plus.feature.zehani.settings

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.common.logging.BayitLogger
import tv.bayit.plus.core.data.repository.AvatarOutfitRepository
import javax.inject.Inject

@HiltViewModel
class AvatarSettingsViewModel @Inject constructor(
    private val avatarOutfitRepository: AvatarOutfitRepository,
    private val logger: BayitLogger,
) : ViewModel() {

    private val _uiState = MutableStateFlow<AvatarSettingsUiState>(AvatarSettingsUiState.Loading)
    val uiState: StateFlow<AvatarSettingsUiState> = _uiState.asStateFlow()

    init {
        loadAvatarSettings()
    }

    fun selectOutfit(outfitId: String) {
        viewModelScope.launch {
            logger.debug("Selecting avatar outfit", mapOf("outfitId" to outfitId))
            when (val result = avatarOutfitRepository.equipOutfit(outfitId)) {
                is BayitResult.Success -> {
                    logger.info("Outfit selected", mapOf("outfitId" to outfitId))
                    loadAvatarSettings()
                }
                is BayitResult.Error -> {
                    logger.error("Select outfit failed", result.exception)
                }
                is BayitResult.Loading -> Unit
            }
        }
    }

    fun togglePrivacy(enabled: Boolean) {
        val current = _uiState.value as? AvatarSettingsUiState.Success ?: return
        _uiState.value = current.copy(privacyEnabled = enabled)
        logger.debug("Avatar privacy toggled", mapOf("enabled" to enabled.toString()))
    }

    fun toggleAnimations(enabled: Boolean) {
        val current = _uiState.value as? AvatarSettingsUiState.Success ?: return
        _uiState.value = current.copy(animationsEnabled = enabled)
        logger.debug("Avatar animations toggled", mapOf("enabled" to enabled.toString()))
    }

    fun retry() {
        _uiState.value = AvatarSettingsUiState.Loading
        loadAvatarSettings()
    }

    private fun loadAvatarSettings() {
        viewModelScope.launch {
            logger.debug("Loading avatar settings")
            when (val result = avatarOutfitRepository.getAvailableOutfits()) {
                is BayitResult.Success -> {
                    val outfits = result.data
                    logger.info("Avatar settings loaded", mapOf("outfitsCount" to outfits.size.toString()))
                    _uiState.value = AvatarSettingsUiState.Success(
                        availableOutfits = outfits,
                        selectedOutfitId = outfits.firstOrNull()?.hashCode()?.toString(),
                        privacyEnabled = true,
                        animationsEnabled = true,
                    )
                }
                is BayitResult.Error -> {
                    logger.error("Avatar settings load failed", result.exception)
                    _uiState.value = AvatarSettingsUiState.Error(
                        message = result.message ?: result.exception.message.orEmpty(),
                    )
                }
                is BayitResult.Loading -> Unit
            }
        }
    }
}

sealed interface AvatarSettingsUiState {
    data object Loading : AvatarSettingsUiState

    data class Success(
        val availableOutfits: List<Any>,
        val selectedOutfitId: String?,
        val privacyEnabled: Boolean,
        val animationsEnabled: Boolean,
    ) : AvatarSettingsUiState

    data class Error(val message: String) : AvatarSettingsUiState
}

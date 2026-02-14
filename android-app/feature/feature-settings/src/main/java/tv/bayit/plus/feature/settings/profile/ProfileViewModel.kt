package tv.bayit.plus.feature.settings.profile

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.common.logging.BayitLogger
import tv.bayit.plus.core.data.repository.UserRepository
import tv.bayit.plus.core.model.ProfileResponse
import javax.inject.Inject

@HiltViewModel
class ProfileViewModel @Inject constructor(
    private val userRepository: UserRepository,
    private val logger: BayitLogger,
) : ViewModel() {

    private val _uiState = MutableStateFlow<ProfileUiState>(ProfileUiState.Loading)
    val uiState: StateFlow<ProfileUiState> = _uiState.asStateFlow()

    init {
        loadProfile()
    }

    private fun loadProfile() {
        viewModelScope.launch {
            logger.debug("Loading profile for editing")
            when (val result = userRepository.getCurrentUser()) {
                is BayitResult.Success -> {
                    val profile = result.data as? ProfileResponse
                    _uiState.value = ProfileUiState.Success(
                        displayName = profile?.displayName.orEmpty(),
                        email = profile?.email.orEmpty(),
                        avatarUrl = profile?.avatar.orEmpty(),
                        language = profile?.language.orEmpty(),
                        isSaving = false,
                    )
                    logger.info("Profile loaded for editing")
                }
                is BayitResult.Error -> {
                    logger.error("Failed to load profile", result.exception)
                    _uiState.value = ProfileUiState.Error(
                        message = result.message ?: result.exception.message.orEmpty(),
                    )
                }
                is BayitResult.Loading -> Unit
            }
        }
    }

    fun updateDisplayName(name: String) {
        val current = _uiState.value as? ProfileUiState.Success ?: return
        _uiState.value = current.copy(displayName = name)
    }

    fun updateAvatarUrl(url: String) {
        val current = _uiState.value as? ProfileUiState.Success ?: return
        _uiState.value = current.copy(avatarUrl = url)
    }

    fun saveProfile() {
        val current = _uiState.value as? ProfileUiState.Success ?: return
        _uiState.value = current.copy(isSaving = true)

        viewModelScope.launch {
            logger.debug("Saving profile", mapOf("displayName" to current.displayName))
            when (val result = userRepository.updateProfile(current.displayName, current.avatarUrl.ifEmpty { null })) {
                is BayitResult.Success -> {
                    _uiState.value = current.copy(isSaving = false)
                    logger.info("Profile saved")
                }
                is BayitResult.Error -> {
                    logger.error("Failed to save profile", result.exception)
                    _uiState.value = current.copy(isSaving = false)
                }
                is BayitResult.Loading -> Unit
            }
        }
    }

    fun retry() {
        _uiState.value = ProfileUiState.Loading
        loadProfile()
    }
}

sealed interface ProfileUiState {
    data object Loading : ProfileUiState

    data class Success(
        val displayName: String,
        val email: String,
        val avatarUrl: String,
        val language: String,
        val isSaving: Boolean,
    ) : ProfileUiState

    data class Error(val message: String) : ProfileUiState
}

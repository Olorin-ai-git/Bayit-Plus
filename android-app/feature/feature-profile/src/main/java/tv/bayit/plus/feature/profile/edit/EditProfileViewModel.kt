package tv.bayit.plus.feature.profile.edit

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.common.logging.BayitLogger
import tv.bayit.plus.core.data.repository.ProfileRepository
import javax.inject.Inject

@HiltViewModel
class EditProfileViewModel @Inject constructor(
    private val profileRepository: ProfileRepository,
    private val savedStateHandle: SavedStateHandle,
    private val logger: BayitLogger,
) : ViewModel() {

    private val profileId: String = checkNotNull(savedStateHandle["profileId"]) {
        "EditProfileViewModel requires profileId"
    }

    private val _uiState = MutableStateFlow<EditProfileUiState>(EditProfileUiState.Loading)
    val uiState: StateFlow<EditProfileUiState> = _uiState.asStateFlow()

    init {
        loadProfile()
    }

    private fun loadProfile() {
        viewModelScope.launch {
            logger.debug("Loading profile", mapOf("profileId" to profileId))

            when (val result = profileRepository.getProfile(profileId)) {
                is BayitResult.Success -> {
                    val profile = result.data
                    logger.info("Profile loaded", mapOf("profileId" to profileId))
                    _uiState.value = EditProfileUiState.Input(
                        name = profile.name,
                        avatarUrl = profile.avatarUrl.orEmpty(),
                    )
                }

                is BayitResult.Error -> {
                    logger.error(
                        "Failed to load profile",
                        error = result.exception,
                        metadata = mapOf("profileId" to profileId),
                    )
                    _uiState.value = EditProfileUiState.Error(
                        message = result.message ?: "Failed to load profile",
                    )
                }

                is BayitResult.Loading -> Unit
            }
        }
    }

    fun updateName(name: String) {
        val current = _uiState.value as? EditProfileUiState.Input ?: return
        _uiState.value = current.copy(name = name)
    }

    fun updateAvatar(avatarUrl: String) {
        val current = _uiState.value as? EditProfileUiState.Input ?: return
        _uiState.value = current.copy(avatarUrl = avatarUrl)
    }

    fun save() {
        val current = _uiState.value as? EditProfileUiState.Input ?: return

        if (current.name.isBlank()) return

        viewModelScope.launch {
            _uiState.value = EditProfileUiState.Saving

            logger.debug("Saving profile", mapOf("profileId" to profileId))

            when (val result = profileRepository.updateProfile(
                profileId = profileId,
                name = current.name.trim(),
                avatarUrl = current.avatarUrl.ifBlank { null },
            )) {
                is BayitResult.Success -> {
                    logger.info("Profile saved", mapOf("profileId" to profileId))
                    _uiState.value = EditProfileUiState.Saved
                }

                is BayitResult.Error -> {
                    logger.error(
                        "Failed to save profile",
                        error = result.exception,
                        metadata = mapOf("profileId" to profileId),
                    )
                    _uiState.value = EditProfileUiState.Error(
                        message = result.message ?: "Failed to save profile",
                    )
                }

                is BayitResult.Loading -> Unit
            }
        }
    }

    fun dismissError() {
        if (_uiState.value is EditProfileUiState.Error) {
            loadProfile()
        }
    }
}

sealed interface EditProfileUiState {
    data object Loading : EditProfileUiState

    data class Input(
        val name: String,
        val avatarUrl: String,
    ) : EditProfileUiState

    data object Saving : EditProfileUiState

    data object Saved : EditProfileUiState

    data class Error(
        val message: String,
    ) : EditProfileUiState
}

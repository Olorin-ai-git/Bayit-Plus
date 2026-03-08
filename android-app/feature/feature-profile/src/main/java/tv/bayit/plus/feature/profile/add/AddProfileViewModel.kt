package tv.bayit.plus.feature.profile.add

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.common.CdnBaseUrl
import tv.bayit.plus.core.common.logging.BayitLogger
import tv.bayit.plus.core.data.repository.HouseholdRepository
import tv.bayit.plus.core.model.AvatarOptions
import javax.inject.Inject

@HiltViewModel
class AddProfileViewModel @Inject constructor(
    private val householdRepository: HouseholdRepository,
    private val logger: BayitLogger,
    @CdnBaseUrl private val cdnBaseUrl: String,
) : ViewModel() {

    val avatarUrls: List<String> = AvatarOptions.avatarUrls(cdnBaseUrl)

    private val _uiState = MutableStateFlow<AddProfileUiState>(
        AddProfileUiState.Input(),
    )
    val uiState: StateFlow<AddProfileUiState> = _uiState.asStateFlow()

    fun updateName(name: String) {
        val current = _uiState.value as? AddProfileUiState.Input ?: return
        _uiState.value = current.copy(name = name, fieldError = null)
    }

    fun updateSelectedAvatarUrl(avatarUrl: String) {
        val current = _uiState.value as? AddProfileUiState.Input ?: return
        _uiState.value = current.copy(selectedAvatarUrl = avatarUrl, fieldError = null)
    }

    fun updateAgeGroup(ageGroup: AgeGroup) {
        val current = _uiState.value as? AddProfileUiState.Input ?: return
        _uiState.value = current.copy(ageGroup = ageGroup, fieldError = null)
    }

    fun createProfile() {
        val current = _uiState.value as? AddProfileUiState.Input ?: return

        val validationError = validateInput(current)
        if (validationError != null) {
            _uiState.value = current.copy(fieldError = validationError)
            return
        }

        viewModelScope.launch {
            _uiState.value = AddProfileUiState.Loading

            logger.debug(
                "Creating profile",
                mapOf("name" to current.name, "ageGroup" to current.ageGroup.apiValue),
            )

            when (val result = householdRepository.addProfile(
                name = current.name.trim(),
                avatarUrl = current.selectedAvatarUrl.ifBlank { null },
                ageGroup = current.ageGroup.apiValue,
            )) {
                is BayitResult.Success -> {
                    logger.info(
                        "Profile created",
                        mapOf("name" to current.name),
                    )
                    _uiState.value = AddProfileUiState.Success
                }

                is BayitResult.Error -> {
                    logger.error(
                        "Failed to create profile",
                        error = result.exception,
                        metadata = mapOf("name" to current.name),
                    )
                    _uiState.value = AddProfileUiState.Error(
                        message = result.message ?: "Failed to create profile",
                        previousInput = current,
                    )
                }

                is BayitResult.Loading -> Unit
            }
        }
    }

    fun dismissError() {
        val current = _uiState.value
        if (current is AddProfileUiState.Error) {
            _uiState.value = current.previousInput
        }
    }

    private fun validateInput(input: AddProfileUiState.Input): String? {
        if (input.name.isBlank()) return "Profile name is required"
        if (input.name.trim().length < MIN_NAME_LENGTH) return "Name must be at least $MIN_NAME_LENGTH characters"
        if (input.name.trim().length > MAX_NAME_LENGTH) return "Name must be at most $MAX_NAME_LENGTH characters"
        return null
    }

    companion object {
        private const val MIN_NAME_LENGTH = 2
        private const val MAX_NAME_LENGTH = 30
    }
}

enum class AgeGroup(val apiValue: String, val displayLabel: String) {
    CHILD("child", "Child (0-7)"),
    YOUNGSTER("youngster", "Youngster (8-12)"),
    TEEN("teen", "Teen (13-17)"),
    ADULT("adult", "Adult (18+)"),
}

sealed interface AddProfileUiState {
    data class Input(
        val name: String = "",
        val selectedAvatarUrl: String = "",
        val ageGroup: AgeGroup = AgeGroup.ADULT,
        val fieldError: String? = null,
    ) : AddProfileUiState

    data object Loading : AddProfileUiState

    data class Error(
        val message: String,
        val previousInput: Input,
    ) : AddProfileUiState

    data object Success : AddProfileUiState
}

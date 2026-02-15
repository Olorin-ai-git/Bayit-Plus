package tv.bayit.plus.feature.zehani.mode

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.common.logging.BayitLogger
import tv.bayit.plus.core.data.repository.ZehAniRepository
import javax.inject.Inject

@HiltViewModel
class AvatarModeViewModel @Inject constructor(
    private val zehAniRepository: ZehAniRepository,
    private val logger: BayitLogger,
) : ViewModel() {

    private val _uiState = MutableStateFlow<AvatarModeUiState>(AvatarModeUiState.Loading)
    val uiState: StateFlow<AvatarModeUiState> = _uiState.asStateFlow()

    init {
        loadAvatarMode()
    }

    fun toggleAvatarMode() {
        val currentState = _uiState.value
        if (currentState is AvatarModeUiState.Success) {
            viewModelScope.launch {
                logger.debug("Toggling avatar mode to ${!currentState.isEnabled}")
                _uiState.value = currentState.copy(isEnabled = !currentState.isEnabled)
            }
        }
    }

    fun selectReactionStyle(style: String) {
        val currentState = _uiState.value
        if (currentState is AvatarModeUiState.Success) {
            viewModelScope.launch {
                logger.debug("Selecting reaction style", mapOf("style" to style))
                _uiState.value = currentState.copy(reactionStyle = style)
            }
        }
    }

    fun retry() {
        _uiState.value = AvatarModeUiState.Loading
        loadAvatarMode()
    }

    private fun loadAvatarMode() {
        viewModelScope.launch {
            logger.debug("Loading avatar mode configuration")
            _uiState.value = AvatarModeUiState.Success(
                isEnabled = false,
                avatarPreviewUrl = null,
                reactionStyle = REACTION_STYLES.first(),
            )
        }
    }
}

sealed interface AvatarModeUiState {
    data object Loading : AvatarModeUiState
    data class Success(
        val isEnabled: Boolean,
        val avatarPreviewUrl: String?,
        val reactionStyle: String,
    ) : AvatarModeUiState
    data class Error(val message: String) : AvatarModeUiState
}

val REACTION_STYLES = listOf("Subtle", "Animated", "Expressive", "Minimal")

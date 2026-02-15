package tv.bayit.plus.ui.viewmodel.zehani

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import tv.bayit.plus.data.model.zehani.HighlightReel
import tv.bayit.plus.data.repository.ZehAniRepository
import javax.inject.Inject

data class HighlightReelsUiState(
    val isLoading: Boolean = true,
    val reels: List<HighlightReel> = emptyList(),
    val isGenerating: Boolean = false,
    val error: String? = null
)

@HiltViewModel
class HighlightReelsViewModel @Inject constructor(
    private val repository: ZehAniRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(HighlightReelsUiState())
    val uiState: StateFlow<HighlightReelsUiState> = _uiState.asStateFlow()

    fun loadReels(profileId: String) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)

            repository.getHighlightReels(profileId).collect { result ->
                result.fold(
                    onSuccess = { reels ->
                        _uiState.value = _uiState.value.copy(
                            reels = reels,
                            isLoading = false
                        )
                    },
                    onFailure = { error ->
                        _uiState.value = _uiState.value.copy(
                            isLoading = false,
                            error = error.message ?: "Failed to load highlight reels"
                        )
                    }
                )
            }
        }
    }

    fun generateReel(avatarId: String, profileId: String) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isGenerating = true, error = null)

            repository.generateHighlightReel(avatarId, profileId).collect { result ->
                result.fold(
                    onSuccess = { reel ->
                        _uiState.value = _uiState.value.copy(
                            reels = listOf(reel) + _uiState.value.reels,
                            isGenerating = false
                        )
                    },
                    onFailure = { error ->
                        _uiState.value = _uiState.value.copy(
                            isGenerating = false,
                            error = error.message ?: "Failed to generate highlight reel"
                        )
                    }
                )
            }
        }
    }
}

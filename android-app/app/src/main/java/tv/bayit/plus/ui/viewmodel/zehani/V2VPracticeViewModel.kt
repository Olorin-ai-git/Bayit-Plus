package tv.bayit.plus.ui.viewmodel.zehani

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import tv.bayit.plus.data.model.zehani.V2VSession
import tv.bayit.plus.data.model.zehani.V2VTransformResult
import tv.bayit.plus.data.repository.ZehAniRepository
import javax.inject.Inject

data class V2VPracticeUiState(
    val isLoading: Boolean = false,
    val isTransforming: Boolean = false,
    val sessions: List<V2VSession> = emptyList(),
    val latestResult: V2VTransformResult? = null,
    val error: String? = null
)

@HiltViewModel
class V2VPracticeViewModel @Inject constructor(
    private val repository: ZehAniRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(V2VPracticeUiState())
    val uiState: StateFlow<V2VPracticeUiState> = _uiState.asStateFlow()

    fun loadSessions(profileId: String) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)

            repository.getV2VSessions(profileId).collect { result ->
                result.fold(
                    onSuccess = { sessions ->
                        _uiState.value = _uiState.value.copy(
                            sessions = sessions,
                            isLoading = false
                        )
                    },
                    onFailure = { error ->
                        _uiState.value = _uiState.value.copy(
                            isLoading = false,
                            error = error.message ?: "Failed to load sessions"
                        )
                    }
                )
            }
        }
    }

    fun transformVoice(
        avatarId: String,
        profileId: String,
        audioBase64: String,
        targetPhraseHe: String
    ) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isTransforming = true, error = null)

            repository.transformVoice(avatarId, profileId, audioBase64, targetPhraseHe)
                .collect { result ->
                    result.fold(
                        onSuccess = { transformResult ->
                            _uiState.value = _uiState.value.copy(
                                latestResult = transformResult,
                                isTransforming = false
                            )
                            // Reload sessions to show updated history
                            loadSessions(profileId)
                        },
                        onFailure = { error ->
                            _uiState.value = _uiState.value.copy(
                                isTransforming = false,
                                error = error.message ?: "Voice transformation failed"
                            )
                        }
                    )
                }
        }
    }

    fun clearLatestResult() {
        _uiState.value = _uiState.value.copy(latestResult = null)
    }
}

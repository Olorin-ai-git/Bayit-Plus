package tv.bayit.plus.ui.viewmodel.zehani

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import tv.bayit.plus.data.model.zehani.AvatarMesh
import tv.bayit.plus.data.model.zehani.MeshGlbUrl
import tv.bayit.plus.data.repository.ZehAniRepository
import javax.inject.Inject

data class Avatar3DUiState(
    val isLoading: Boolean = true,
    val mesh: AvatarMesh? = null,
    val glbUrl: MeshGlbUrl? = null,
    val error: String? = null
)

@HiltViewModel
class Avatar3DViewModel @Inject constructor(
    private val repository: ZehAniRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(Avatar3DUiState())
    val uiState: StateFlow<Avatar3DUiState> = _uiState.asStateFlow()

    fun loadAvatar(avatarId: String) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)

            repository.getMeshStatus(avatarId).collect { result ->
                result.fold(
                    onSuccess = { mesh ->
                        _uiState.value = _uiState.value.copy(
                            mesh = mesh,
                            isLoading = false
                        )
                        if (mesh.hasGlb) {
                            loadGlbUrl(avatarId)
                        }
                    },
                    onFailure = { error ->
                        _uiState.value = _uiState.value.copy(
                            isLoading = false,
                            error = error.message ?: "Failed to load avatar"
                        )
                    }
                )
            }
        }
    }

    private suspend fun loadGlbUrl(avatarId: String) {
        repository.getGlbUrl(avatarId).collect { result ->
            result.fold(
                onSuccess = { glbUrl ->
                    _uiState.value = _uiState.value.copy(glbUrl = glbUrl)
                },
                onFailure = { }  // Ignore GLB URL failures
            )
        }
    }

    fun generateMesh(profileId: String, pin: String) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)

            repository.generateMesh(profileId, pin).collect { result ->
                result.fold(
                    onSuccess = { mesh ->
                        _uiState.value = _uiState.value.copy(
                            mesh = mesh,
                            isLoading = false
                        )
                    },
                    onFailure = { error ->
                        _uiState.value = _uiState.value.copy(
                            isLoading = false,
                            error = error.message ?: "Failed to generate mesh"
                        )
                    }
                )
            }
        }
    }
}

package tv.bayit.plus.ui.viewmodel.zehani

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import tv.bayit.plus.data.model.zehani.MagicMirrorGreeting
import tv.bayit.plus.data.model.zehani.MeshGlbUrl
import tv.bayit.plus.data.repository.ZehAniRepository
import javax.inject.Inject

sealed class MagicMirrorUiState {
    object Loading : MagicMirrorUiState()
    data class Success(
        val greeting: MagicMirrorGreeting,
        val glbUrl: MeshGlbUrl? = null
    ) : MagicMirrorUiState()
    data class Error(val message: String) : MagicMirrorUiState()
    object NoAvatar : MagicMirrorUiState()
}

@HiltViewModel
class MagicMirrorViewModel @Inject constructor(
    private val repository: ZehAniRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow<MagicMirrorUiState>(MagicMirrorUiState.Loading)
    val uiState: StateFlow<MagicMirrorUiState> = _uiState.asStateFlow()

    private val _isRefreshing = MutableStateFlow(false)
    val isRefreshing: StateFlow<Boolean> = _isRefreshing.asStateFlow()

    fun loadGreeting(profileId: String, avatarId: String?) {
        viewModelScope.launch {
            _uiState.value = MagicMirrorUiState.Loading

            repository.getMagicMirrorGreeting(profileId).collect { result ->
                result.fold(
                    onSuccess = { greeting ->
                        if (avatarId != null) {
                            loadGlbUrl(greeting, avatarId)
                        } else {
                            _uiState.value = MagicMirrorUiState.Success(greeting)
                        }
                    },
                    onFailure = { error ->
                        if (error.message?.contains("404") == true) {
                            _uiState.value = MagicMirrorUiState.NoAvatar
                        } else {
                            _uiState.value = MagicMirrorUiState.Error(
                                error.message ?: "Failed to load greeting"
                            )
                        }
                    }
                )
            }
        }
    }

    private suspend fun loadGlbUrl(greeting: MagicMirrorGreeting, avatarId: String) {
        repository.getGlbUrl(avatarId).collect { result ->
            result.fold(
                onSuccess = { glbUrl ->
                    _uiState.value = MagicMirrorUiState.Success(greeting, glbUrl)
                },
                onFailure = {
                    // Still show greeting even if GLB fails
                    _uiState.value = MagicMirrorUiState.Success(greeting)
                }
            )
        }
    }

    fun refreshGreeting(profileId: String, avatarId: String?) {
        viewModelScope.launch {
            _isRefreshing.value = true

            repository.refreshMagicMirrorGreeting(profileId).collect { result ->
                result.fold(
                    onSuccess = { greeting ->
                        if (avatarId != null) {
                            loadGlbUrl(greeting, avatarId)
                        } else {
                            _uiState.value = MagicMirrorUiState.Success(greeting)
                        }
                        _isRefreshing.value = false
                    },
                    onFailure = { error ->
                        _uiState.value = MagicMirrorUiState.Error(
                            error.message ?: "Failed to refresh greeting"
                        )
                        _isRefreshing.value = false
                    }
                )
            }
        }
    }
}

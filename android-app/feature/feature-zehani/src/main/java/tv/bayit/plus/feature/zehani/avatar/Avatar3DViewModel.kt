package tv.bayit.plus.feature.zehani.avatar

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
import tv.bayit.plus.core.data.repository.AvatarMeshRepository
import javax.inject.Inject

@HiltViewModel
class Avatar3DViewModel @Inject constructor(
    savedStateHandle: SavedStateHandle,
    private val avatarMeshRepository: AvatarMeshRepository,
    private val logger: BayitLogger,
) : ViewModel() {

    val avatarId: String = checkNotNull(savedStateHandle["avatarId"])

    private val _uiState = MutableStateFlow<Avatar3DUiState>(Avatar3DUiState.Loading)
    val uiState: StateFlow<Avatar3DUiState> = _uiState.asStateFlow()

    init {
        loadAvatar3D()
    }

    fun rotate(x: Float, y: Float) {
        val current = _uiState.value as? Avatar3DUiState.Success ?: return
        _uiState.value = current.copy(rotationX = x, rotationY = y)
    }

    fun zoom(scale: Float) {
        val current = _uiState.value as? Avatar3DUiState.Success ?: return
        _uiState.value = current.copy(zoomLevel = scale.coerceIn(0.5f, 3f))
    }

    fun toggleAnimation() {
        val current = _uiState.value as? Avatar3DUiState.Success ?: return
        _uiState.value = current.copy(isAnimating = !current.isAnimating)
    }

    fun retry() {
        _uiState.value = Avatar3DUiState.Loading
        loadAvatar3D()
    }

    private fun loadAvatar3D() {
        viewModelScope.launch {
            logger.debug("Loading 3D avatar mesh", mapOf("avatarId" to avatarId))
            when (val result = avatarMeshRepository.getAvatarMesh(avatarId)) {
                is BayitResult.Success -> {
                    logger.info("3D avatar mesh loaded", mapOf("avatarId" to avatarId))
                    _uiState.value = Avatar3DUiState.Success(
                        meshData = result.data,
                        rotationX = 0f,
                        rotationY = 0f,
                        zoomLevel = 1f,
                        isAnimating = false,
                    )
                }
                is BayitResult.Error -> {
                    logger.error("3D avatar mesh load failed", result.exception)
                    _uiState.value = Avatar3DUiState.Error(
                        message = result.message ?: result.exception.message.orEmpty(),
                    )
                }
                is BayitResult.Loading -> Unit
            }
        }
    }
}

sealed interface Avatar3DUiState {
    data object Loading : Avatar3DUiState

    data class Success(
        val meshData: Any,
        val rotationX: Float,
        val rotationY: Float,
        val zoomLevel: Float,
        val isAnimating: Boolean,
    ) : Avatar3DUiState

    data class Error(val message: String) : Avatar3DUiState
}

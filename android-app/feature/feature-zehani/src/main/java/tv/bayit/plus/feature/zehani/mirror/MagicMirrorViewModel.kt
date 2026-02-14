package tv.bayit.plus.feature.zehani.mirror

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
import tv.bayit.plus.core.data.repository.ZehAniRepository
import javax.inject.Inject

@HiltViewModel
class MagicMirrorViewModel @Inject constructor(
    savedStateHandle: SavedStateHandle,
    private val zehAniRepository: ZehAniRepository,
    private val logger: BayitLogger,
) : ViewModel() {

    val profileId: String = checkNotNull(savedStateHandle["profileId"])

    private val _uiState = MutableStateFlow<MagicMirrorUiState>(MagicMirrorUiState.CameraReady)
    val uiState: StateFlow<MagicMirrorUiState> = _uiState.asStateFlow()

    fun identifyFromCapture(imageData: ByteArray) {
        viewModelScope.launch {
            _uiState.value = MagicMirrorUiState.Processing
            logger.debug("Identifying person from capture", mapOf("profileId" to profileId))

            when (val result = zehAniRepository.identifyPerson(imageData)) {
                is BayitResult.Success -> {
                    logger.info("Person identified", mapOf("profileId" to profileId))
                    _uiState.value = MagicMirrorUiState.ResultReady(result.data)
                }
                is BayitResult.Error -> {
                    logger.error("Face identification failed", result.exception)
                    _uiState.value = MagicMirrorUiState.Error(
                        result.message ?: result.exception.message.orEmpty(),
                    )
                }
                is BayitResult.Loading -> Unit
            }
        }
    }

    fun getPersonDetails(personId: String) {
        viewModelScope.launch {
            _uiState.value = MagicMirrorUiState.Processing
            logger.debug("Loading person details", mapOf("personId" to personId))

            when (val result = zehAniRepository.getPersonDetails(personId)) {
                is BayitResult.Success -> {
                    logger.info("Person details loaded", mapOf("personId" to personId))
                    _uiState.value = MagicMirrorUiState.PersonDetail(result.data)
                }
                is BayitResult.Error -> {
                    logger.error("Person details load failed", result.exception)
                    _uiState.value = MagicMirrorUiState.Error(
                        result.message ?: result.exception.message.orEmpty(),
                    )
                }
                is BayitResult.Loading -> Unit
            }
        }
    }

    fun resetToCamera() {
        _uiState.value = MagicMirrorUiState.CameraReady
    }
}

sealed interface MagicMirrorUiState {
    data object CameraReady : MagicMirrorUiState
    data object Processing : MagicMirrorUiState
    data class ResultReady(val identificationResult: Any) : MagicMirrorUiState
    data class PersonDetail(val person: Any) : MagicMirrorUiState
    data class Error(val message: String) : MagicMirrorUiState
}

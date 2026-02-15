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
import tv.bayit.plus.core.model.zehani.MagicMirrorGreeting
import javax.inject.Inject

@HiltViewModel
class MagicMirrorViewModel @Inject constructor(
    savedStateHandle: SavedStateHandle,
    private val zehAniRepository: ZehAniRepository,
    private val logger: BayitLogger,
) : ViewModel() {

    val profileId: String = checkNotNull(savedStateHandle["profileId"])

    private val _uiState = MutableStateFlow<MagicMirrorUiState>(MagicMirrorUiState.Loading)
    val uiState: StateFlow<MagicMirrorUiState> = _uiState.asStateFlow()

    init {
        loadGreeting()
    }

    fun refreshGreeting() {
        viewModelScope.launch {
            _uiState.value = MagicMirrorUiState.Loading
            logger.debug("Refreshing greeting", mapOf("profileId" to profileId))

            when (val result = zehAniRepository.refreshGreeting(profileId)) {
                is BayitResult.Success -> {
                    logger.info("Greeting refreshed", mapOf("profileId" to profileId))
                    _uiState.value = MagicMirrorUiState.GreetingReady(result.data)
                }
                is BayitResult.Error -> {
                    logger.error("Greeting refresh failed", result.exception)
                    _uiState.value = MagicMirrorUiState.Error(
                        result.message ?: result.exception.message.orEmpty(),
                    )
                }
                is BayitResult.Loading -> Unit
            }
        }
    }

    fun retry() {
        _uiState.value = MagicMirrorUiState.Loading
        loadGreeting()
    }

    private fun loadGreeting() {
        viewModelScope.launch {
            logger.debug("Loading daily greeting", mapOf("profileId" to profileId))

            when (val result = zehAniRepository.getDailyGreeting(profileId)) {
                is BayitResult.Success -> {
                    logger.info("Daily greeting loaded", mapOf("profileId" to profileId))
                    _uiState.value = MagicMirrorUiState.GreetingReady(result.data)
                }
                is BayitResult.Error -> {
                    logger.error("Daily greeting load failed", result.exception)
                    _uiState.value = MagicMirrorUiState.Error(
                        result.message ?: result.exception.message.orEmpty(),
                    )
                }
                is BayitResult.Loading -> Unit
            }
        }
    }
}

sealed interface MagicMirrorUiState {
    data object Loading : MagicMirrorUiState
    data class GreetingReady(val greeting: MagicMirrorGreeting) : MagicMirrorUiState
    data class Error(val message: String) : MagicMirrorUiState
}

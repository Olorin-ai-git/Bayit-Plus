package tv.bayit.plus.feature.social.grandparent

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
import tv.bayit.plus.core.data.repository.GrandparentBridgeRepository
import javax.inject.Inject

/**
 * ViewModel for Shared Moments screen.
 *
 * Manages shared content between user and grandparent connection.
 * Loads and displays timeline of shared media items.
 */
@HiltViewModel
class SharedMomentsViewModel @Inject constructor(
    private val repository: GrandparentBridgeRepository,
    private val logger: BayitLogger,
    savedStateHandle: SavedStateHandle,
) : ViewModel() {

    private val connectionId: String = savedStateHandle["connectionId"] ?: ""

    private val _uiState = MutableStateFlow<SharedMomentsUiState>(SharedMomentsUiState.Loading)
    val uiState: StateFlow<SharedMomentsUiState> = _uiState.asStateFlow()

    init {
        loadSharedContent()
    }

    /**
     * Load shared content for the current connection.
     */
    fun loadSharedContent() {
        viewModelScope.launch {
            _uiState.value = SharedMomentsUiState.Loading
            logger.debug("Loading shared content", mapOf("connectionId" to connectionId))

            when (val result = repository.getSharedContent(connectionId)) {
                is BayitResult.Success -> {
                    val content = result.data
                    logger.info("Loaded shared content", mapOf("count" to content.size))
                    _uiState.value = SharedMomentsUiState.Success(content)
                }
                is BayitResult.Error -> {
                    logger.error("Failed to load shared content", result.exception)
                    _uiState.value = SharedMomentsUiState.Error(
                        result.message ?: result.exception.message.orEmpty(),
                    )
                }
                is BayitResult.Loading -> Unit
            }
        }
    }

    /**
     * Share content with the connected grandparent.
     */
    fun shareContent(mediaId: String, message: String?) {
        viewModelScope.launch {
            logger.info("Sharing content", mapOf("mediaId" to mediaId, "connectionId" to connectionId))

            when (val result = repository.shareContent(connectionId, mediaId, message)) {
                is BayitResult.Success -> {
                    logger.info("Content shared successfully")
                    loadSharedContent()
                }
                is BayitResult.Error -> {
                    logger.error("Failed to share content", result.exception)
                }
                is BayitResult.Loading -> Unit
            }
        }
    }
}

/**
 * UI state for Shared Moments screen.
 */
sealed interface SharedMomentsUiState {
    data object Loading : SharedMomentsUiState
    data class Success(val sharedContent: List<Any>) : SharedMomentsUiState
    data class Error(val message: String) : SharedMomentsUiState
}

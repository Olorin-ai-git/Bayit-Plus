package tv.bayit.plus.feature.vod.playlist

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.common.logging.BayitLogger
import tv.bayit.plus.core.data.repository.PlaylistRepository
import tv.bayit.plus.core.model.PlaylistItem
import javax.inject.Inject

@HiltViewModel
class PlaylistViewModel @Inject constructor(
    private val playlistRepository: PlaylistRepository,
    private val logger: BayitLogger,
) : ViewModel() {

    private val _uiState = MutableStateFlow<PlaylistUiState>(PlaylistUiState.Loading)
    val uiState: StateFlow<PlaylistUiState> = _uiState.asStateFlow()

    init {
        loadPlaylists()
    }

    fun refresh() {
        val currentState = _uiState.value
        if (currentState is PlaylistUiState.Success) {
            _uiState.value = currentState.copy(isRefreshing = true)
        }
        loadPlaylists()
    }

    fun retry() {
        _uiState.value = PlaylistUiState.Loading
        loadPlaylists()
    }

    private fun loadPlaylists() {
        viewModelScope.launch {
            logger.debug("Loading playlists")
            when (val result = playlistRepository.getPlaylists()) {
                is BayitResult.Success -> {
                    @Suppress("UNCHECKED_CAST")
                    val items = (result.data as List<Any>).filterIsInstance<PlaylistItem>()

                    logger.info(
                        "Playlists loaded",
                        mapOf("count" to items.size.toString()),
                    )

                    if (items.isEmpty()) {
                        _uiState.value = PlaylistUiState.Empty
                    } else {
                        _uiState.value = PlaylistUiState.Success(
                            playlists = items,
                            isRefreshing = false,
                        )
                    }
                }
                is BayitResult.Error -> {
                    logger.error(
                        "Playlists load failed",
                        result.exception,
                        mapOf("errorMessage" to result.message.orEmpty()),
                    )
                    _uiState.value = PlaylistUiState.Error(
                        message = result.message ?: result.exception.message.orEmpty(),
                    )
                }
                is BayitResult.Loading -> Unit
            }
        }
    }
}

sealed interface PlaylistUiState {
    data object Loading : PlaylistUiState
    data object Empty : PlaylistUiState

    data class Success(
        val playlists: List<PlaylistItem>,
        val isRefreshing: Boolean = false,
    ) : PlaylistUiState

    data class Error(
        val message: String,
    ) : PlaylistUiState
}

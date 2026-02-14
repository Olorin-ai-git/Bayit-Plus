package tv.bayit.plus.feature.radio

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.common.logging.BayitLogger
import tv.bayit.plus.core.data.repository.RadioRepository
import tv.bayit.plus.core.model.RadioStationItem
import javax.inject.Inject

@HiltViewModel
class RadioViewModel @Inject constructor(
    private val radioRepository: RadioRepository,
    private val logger: BayitLogger,
) : ViewModel() {

    private val _uiState = MutableStateFlow<RadioUiState>(RadioUiState.Loading)
    val uiState: StateFlow<RadioUiState> = _uiState.asStateFlow()

    private val favoriteStationIds = mutableSetOf<String>()

    init {
        loadStations()
    }

    fun refresh() {
        val currentState = _uiState.value
        if (currentState is RadioUiState.Success) {
            _uiState.value = currentState.copy(isRefreshing = true)
        }
        loadStations()
    }

    fun toggleFavorite(stationId: String) {
        viewModelScope.launch {
            logger.debug(
                "Toggling radio favorite",
                mapOf("stationId" to stationId),
            )

            when (val result = radioRepository.toggleFavorite(stationId)) {
                is BayitResult.Success -> {
                    if (result.data) {
                        favoriteStationIds.add(stationId)
                    } else {
                        favoriteStationIds.remove(stationId)
                    }
                    updateFavoriteState()
                    logger.info(
                        "Radio favorite toggled",
                        mapOf("stationId" to stationId, "isFavorite" to result.data.toString()),
                    )
                }
                is BayitResult.Error -> {
                    logger.error(
                        "Radio favorite toggle failed",
                        result.exception,
                        mapOf("stationId" to stationId, "errorMessage" to result.message.orEmpty()),
                    )
                }
                is BayitResult.Loading -> Unit
            }
        }
    }

    private fun updateFavoriteState() {
        val currentState = _uiState.value
        if (currentState is RadioUiState.Success) {
            _uiState.value = currentState.copy(
                favoriteIds = favoriteStationIds.toSet(),
            )
        }
    }

    private fun loadStations() {
        viewModelScope.launch {
            logger.debug("Loading radio stations")

            when (val result = radioRepository.getStations()) {
                is BayitResult.Success -> {
                    @Suppress("UNCHECKED_CAST")
                    val stations = (result.data as List<Any>).filterIsInstance<RadioStationItem>()

                    loadFavorites()

                    logger.info(
                        "Radio stations loaded",
                        mapOf("stationCount" to stations.size.toString()),
                    )

                    _uiState.value = RadioUiState.Success(
                        stations = stations,
                        favoriteIds = favoriteStationIds.toSet(),
                        nowPlayingStationId = null,
                        isRefreshing = false,
                    )
                }
                is BayitResult.Error -> {
                    logger.error(
                        "Radio stations load failed",
                        result.exception,
                        mapOf("errorMessage" to result.message.orEmpty()),
                    )
                    _uiState.value = RadioUiState.Error(
                        message = result.message ?: result.exception.message.orEmpty(),
                    )
                }
                is BayitResult.Loading -> Unit
            }
        }
    }

    private suspend fun loadFavorites() {
        when (val result = radioRepository.getFavoriteStations()) {
            is BayitResult.Success -> {
                @Suppress("UNCHECKED_CAST")
                val favorites = (result.data as List<Any>).filterIsInstance<RadioStationItem>()
                favoriteStationIds.clear()
                favoriteStationIds.addAll(favorites.map { it.id })
            }
            is BayitResult.Error -> {
                logger.warning(
                    "Failed to load favorite stations",
                    mapOf("errorMessage" to result.message.orEmpty()),
                )
            }
            is BayitResult.Loading -> Unit
        }
    }
}

sealed interface RadioUiState {
    data object Loading : RadioUiState

    data class Success(
        val stations: List<RadioStationItem>,
        val favoriteIds: Set<String>,
        val nowPlayingStationId: String?,
        val isRefreshing: Boolean = false,
    ) : RadioUiState

    data class Error(
        val message: String,
    ) : RadioUiState
}

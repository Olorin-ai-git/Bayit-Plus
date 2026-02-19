package tv.bayit.plus.feature.zehani.movieinteractions

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
import tv.bayit.plus.core.model.zehani.InteractableMovie
import javax.inject.Inject

@HiltViewModel
class MovieInteractionsViewModel @Inject constructor(
    private val zehAniRepository: ZehAniRepository,
    private val logger: BayitLogger,
) : ViewModel() {

    private val _uiState = MutableStateFlow<MovieInteractionsUiState>(MovieInteractionsUiState.Loading)
    val uiState: StateFlow<MovieInteractionsUiState> = _uiState.asStateFlow()

    init {
        loadMovies()
    }

    fun retry() {
        _uiState.value = MovieInteractionsUiState.Loading
        loadMovies()
    }

    private fun loadMovies() {
        viewModelScope.launch {
            logger.debug("Loading interactable movies")
            when (val result = zehAniRepository.listInteractableMovies()) {
                is BayitResult.Success -> {
                    val movies = result.data
                    logger.info(
                        "Interactable movies loaded",
                        mapOf("count" to movies.size.toString()),
                    )
                    _uiState.value = MovieInteractionsUiState.Success(movies = movies)
                }
                is BayitResult.Error -> {
                    logger.error("Failed to load interactable movies", result.exception)
                    _uiState.value = MovieInteractionsUiState.Error(
                        result.message ?: result.exception.message.orEmpty(),
                    )
                }
                is BayitResult.Loading -> Unit
            }
        }
    }
}

sealed interface MovieInteractionsUiState {
    data object Loading : MovieInteractionsUiState
    data class Success(val movies: List<InteractableMovie>) : MovieInteractionsUiState
    data class Error(val message: String) : MovieInteractionsUiState
}

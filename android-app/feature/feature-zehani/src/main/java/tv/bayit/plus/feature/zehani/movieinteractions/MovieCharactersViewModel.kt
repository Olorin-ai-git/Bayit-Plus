package tv.bayit.plus.feature.zehani.movieinteractions

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
import tv.bayit.plus.core.model.zehani.InteractiveCharacter
import javax.inject.Inject

@HiltViewModel
class MovieCharactersViewModel @Inject constructor(
    savedStateHandle: SavedStateHandle,
    private val zehAniRepository: ZehAniRepository,
    private val logger: BayitLogger,
) : ViewModel() {

    val contentId: String = savedStateHandle["contentId"] ?: ""

    private val _uiState = MutableStateFlow<MovieCharactersUiState>(MovieCharactersUiState.Loading)
    val uiState: StateFlow<MovieCharactersUiState> = _uiState.asStateFlow()

    init {
        loadCharacters()
    }

    fun retry() {
        _uiState.value = MovieCharactersUiState.Loading
        loadCharacters()
    }

    private fun loadCharacters() {
        viewModelScope.launch {
            logger.debug("Loading characters for movie", mapOf("contentId" to contentId))
            when (val result = zehAniRepository.getMovieCharacters(contentId)) {
                is BayitResult.Success -> {
                    val characters = result.data.characters
                    logger.info(
                        "Movie characters loaded",
                        mapOf(
                            "contentId" to contentId,
                            "count" to characters.size.toString(),
                        ),
                    )
                    _uiState.value = MovieCharactersUiState.Success(characters = characters)
                }
                is BayitResult.Error -> {
                    logger.error("Failed to load movie characters", result.exception)
                    _uiState.value = MovieCharactersUiState.Error(
                        result.message ?: result.exception.message.orEmpty(),
                    )
                }
                is BayitResult.Loading -> Unit
            }
        }
    }
}

sealed interface MovieCharactersUiState {
    data object Loading : MovieCharactersUiState
    data class Success(val characters: List<InteractiveCharacter>) : MovieCharactersUiState
    data class Error(val message: String) : MovieCharactersUiState
}

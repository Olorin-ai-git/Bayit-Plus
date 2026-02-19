package tv.bayit.plus.feature.vod.detail

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
import tv.bayit.plus.core.data.repository.ContentRepository
import tv.bayit.plus.core.data.repository.DownloadsRepository
import tv.bayit.plus.core.data.repository.MediaRepository
import tv.bayit.plus.core.model.ContentDetail
import tv.bayit.plus.core.model.DownloadStartRequest
import tv.bayit.plus.core.model.RelatedItem
import javax.inject.Inject

/**
 * ViewModel for the Movie Detail screen.
 *
 * Loads movie metadata via [ContentRepository.getContentById] and
 * resolves playback URLs through [MediaRepository.getPlaybackUrl].
 * Exposes [MovieDetailUiState] for pattern matching in the Compose layer.
 */
@HiltViewModel
class MovieDetailViewModel @Inject constructor(
    savedStateHandle: SavedStateHandle,
    private val contentRepository: ContentRepository,
    private val mediaRepository: MediaRepository,
    private val downloadsRepository: DownloadsRepository,
    private val logger: BayitLogger,
) : ViewModel() {

    private val movieId: String = checkNotNull(savedStateHandle["movieId"])

    private val _uiState = MutableStateFlow<MovieDetailUiState>(MovieDetailUiState.Loading)
    val uiState: StateFlow<MovieDetailUiState> = _uiState.asStateFlow()

    init {
        loadMovieDetail()
    }

    fun retry() {
        _uiState.value = MovieDetailUiState.Loading
        loadMovieDetail()
    }

    private fun loadMovieDetail() {
        viewModelScope.launch {
            logger.debug("Loading movie detail", mapOf("movieId" to movieId))

            when (val result = contentRepository.getContentById(movieId)) {
                is BayitResult.Success -> {
                    val detail = result.data as? ContentDetail
                    if (detail == null) {
                        _uiState.value = MovieDetailUiState.Error("Content not found")
                        return@launch
                    }
                    logger.info("Movie detail loaded", mapOf(
                        "movieId" to movieId,
                        "title" to detail.title.orEmpty(),
                    ))
                    _uiState.value = MovieDetailUiState.Success(
                        movieId = detail.id,
                        title = detail.title.orEmpty(),
                        description = detail.description,
                        backdrop = detail.backdrop,
                        thumbnail = detail.thumbnail,
                        year = detail.year,
                        rating = detail.rating?.toString(),
                        genre = detail.genre,
                        duration = detail.duration,
                        director = detail.director,
                        cast = detail.cast,
                        related = detail.related.orEmpty(),
                        isFavorite = false,
                    )
                }
                is BayitResult.Error -> {
                    logger.error("Movie detail load failed", result.exception, mapOf(
                        "movieId" to movieId,
                    ))
                    _uiState.value = MovieDetailUiState.Error(
                        result.message ?: result.exception.message.orEmpty(),
                    )
                }
                is BayitResult.Loading -> Unit
            }
        }
    }

    fun toggleFavorite() {
        val current = _uiState.value as? MovieDetailUiState.Success ?: return
        _uiState.value = current.copy(isFavorite = !current.isFavorite)
        logger.info("Favorite toggled", mapOf(
            "movieId" to movieId,
            "isFavorite" to (!current.isFavorite).toString(),
        ))
    }

    fun startDownload() {
        val current = _uiState.value as? MovieDetailUiState.Success ?: return
        if (current.isDownloading || current.isDownloaded) return
        _uiState.value = current.copy(isDownloading = true)
        viewModelScope.launch {
            when (val result = downloadsRepository.startDownload(DownloadStartRequest(contentId = movieId, contentType = "vod"))) {
                is BayitResult.Success -> {
                    logger.info("Download started", mapOf("movieId" to movieId))
                    _uiState.value = ((_uiState.value as? MovieDetailUiState.Success) ?: return@launch)
                        .copy(isDownloading = false, isDownloaded = true)
                }
                is BayitResult.Error -> {
                    logger.error("Download start failed", result.exception, mapOf("movieId" to movieId))
                    _uiState.value = ((_uiState.value as? MovieDetailUiState.Success) ?: return@launch)
                        .copy(isDownloading = false)
                }
                is BayitResult.Loading -> Unit
            }
        }
    }
}

sealed interface MovieDetailUiState {
    data object Loading : MovieDetailUiState

    data class Success(
        val movieId: String,
        val title: String,
        val description: String?,
        val backdrop: String?,
        val thumbnail: String?,
        val year: Int?,
        val rating: String?,
        val genre: String?,
        val duration: String?,
        val director: String?,
        val cast: List<String>?,
        val related: List<RelatedItem>,
        val isFavorite: Boolean,
        val isDownloading: Boolean = false,
        val isDownloaded: Boolean = false,
    ) : MovieDetailUiState

    data class Error(val message: String) : MovieDetailUiState
}

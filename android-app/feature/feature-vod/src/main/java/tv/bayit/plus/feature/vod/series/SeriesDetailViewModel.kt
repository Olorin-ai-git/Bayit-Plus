package tv.bayit.plus.feature.vod.series

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
import tv.bayit.plus.core.data.repository.DownloadsRepository
import tv.bayit.plus.core.data.repository.SeriesRepository
import tv.bayit.plus.core.model.DownloadStartRequest
import tv.bayit.plus.core.model.EpisodeItem
import tv.bayit.plus.core.model.RelatedItem
import tv.bayit.plus.core.model.SeasonSummary
import tv.bayit.plus.core.model.SeriesDetail
import javax.inject.Inject

/**
 * ViewModel for the Series Detail screen.
 *
 * Loads series metadata and seasons via [SeriesRepository.getSeriesById],
 * then loads episodes for the selected season via [SeriesRepository.getEpisodes].
 * Exposes [SeriesDetailUiState] for pattern matching in the Compose layer.
 */
@HiltViewModel
class SeriesDetailViewModel @Inject constructor(
    savedStateHandle: SavedStateHandle,
    private val seriesRepository: SeriesRepository,
    private val downloadsRepository: DownloadsRepository,
    private val logger: BayitLogger,
) : ViewModel() {

    private val seriesId: String = checkNotNull(savedStateHandle["seriesId"])

    private val _uiState = MutableStateFlow<SeriesDetailUiState>(SeriesDetailUiState.Loading)
    val uiState: StateFlow<SeriesDetailUiState> = _uiState.asStateFlow()

    init {
        loadSeriesDetail()
    }

    fun retry() {
        _uiState.value = SeriesDetailUiState.Loading
        loadSeriesDetail()
    }

    fun downloadAllEpisodes() {
        val episodes = (_uiState.value as? SeriesDetailUiState.Success)?.episodes ?: return
        viewModelScope.launch {
            episodes.forEach { episode ->
                downloadsRepository.startDownload(DownloadStartRequest(contentId = episode.id, contentType = "vod"))
                logger.info("Download started for episode", mapOf("episodeId" to episode.id))
            }
        }
    }

    fun downloadEpisode(episode: EpisodeItem) {
        viewModelScope.launch {
            downloadsRepository.startDownload(DownloadStartRequest(contentId = episode.id, contentType = "vod"))
            logger.info("Download started for episode", mapOf("episodeId" to episode.id))
        }
    }

    fun selectSeason(seasonNumber: Int) {
        val current = _uiState.value as? SeriesDetailUiState.Success ?: return
        if (current.selectedSeason == seasonNumber) return

        _uiState.value = current.copy(
            selectedSeason = seasonNumber,
            isLoadingEpisodes = true,
        )
        loadEpisodes(seasonNumber)
    }

    private fun loadSeriesDetail() {
        viewModelScope.launch {
            logger.debug("Loading series detail", mapOf("seriesId" to seriesId))

            when (val result = seriesRepository.getSeriesById(seriesId)) {
                is BayitResult.Success -> {
                    val detail = result.data as? SeriesDetail
                    if (detail == null) {
                        _uiState.value = SeriesDetailUiState.Error("Series not found")
                        return@launch
                    }
                    logger.info("Series detail loaded", mapOf(
                        "seriesId" to seriesId,
                        "title" to detail.title.orEmpty(),
                        "seasonCount" to (detail.totalSeasons ?: 0).toString(),
                    ))
                    val firstSeason = detail.seasons?.firstOrNull()?.seasonNumber ?: 1
                    _uiState.value = SeriesDetailUiState.Success(
                        seriesId = detail.id,
                        title = detail.title.orEmpty(),
                        description = detail.description,
                        backdrop = detail.backdrop,
                        thumbnail = detail.thumbnail,
                        year = detail.year,
                        rating = detail.rating,
                        genre = detail.genre,
                        seasons = detail.seasons.orEmpty(),
                        selectedSeason = firstSeason,
                        episodes = emptyList(),
                        isLoadingEpisodes = true,
                        related = detail.related.orEmpty(),
                    )
                    loadEpisodes(firstSeason)
                }
                is BayitResult.Error -> {
                    logger.error("Series detail load failed", result.exception, mapOf(
                        "seriesId" to seriesId,
                    ))
                    _uiState.value = SeriesDetailUiState.Error(
                        result.message ?: result.exception.message.orEmpty(),
                    )
                }
                is BayitResult.Loading -> Unit
            }
        }
    }

    private fun loadEpisodes(seasonNumber: Int) {
        viewModelScope.launch {
            logger.debug("Loading episodes", mapOf(
                "seriesId" to seriesId,
                "season" to seasonNumber.toString(),
            ))

            when (val result = seriesRepository.getEpisodes(seriesId, seasonNumber)) {
                is BayitResult.Success -> {
                    @Suppress("UNCHECKED_CAST")
                    val episodes = (result.data as List<Any>).filterIsInstance<EpisodeItem>()

                    logger.info("Episodes loaded", mapOf(
                        "seriesId" to seriesId,
                        "season" to seasonNumber.toString(),
                        "episodeCount" to episodes.size.toString(),
                    ))

                    val current = _uiState.value as? SeriesDetailUiState.Success ?: return@launch
                    _uiState.value = current.copy(
                        episodes = episodes,
                        isLoadingEpisodes = false,
                    )
                }
                is BayitResult.Error -> {
                    logger.error("Episodes load failed", result.exception, mapOf(
                        "seriesId" to seriesId,
                        "season" to seasonNumber.toString(),
                    ))
                    val current = _uiState.value as? SeriesDetailUiState.Success ?: return@launch
                    _uiState.value = current.copy(
                        episodes = emptyList(),
                        isLoadingEpisodes = false,
                    )
                }
                is BayitResult.Loading -> Unit
            }
        }
    }
}

sealed interface SeriesDetailUiState {
    data object Loading : SeriesDetailUiState

    data class Success(
        val seriesId: String,
        val title: String,
        val description: String?,
        val backdrop: String?,
        val thumbnail: String?,
        val year: Int?,
        val rating: String?,
        val genre: String?,
        val seasons: List<SeasonSummary>,
        val selectedSeason: Int,
        val episodes: List<EpisodeItem>,
        val isLoadingEpisodes: Boolean,
        val related: List<RelatedItem>,
    ) : SeriesDetailUiState

    data class Error(val message: String) : SeriesDetailUiState
}

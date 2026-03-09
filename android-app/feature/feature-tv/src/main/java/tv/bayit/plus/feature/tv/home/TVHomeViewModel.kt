package tv.bayit.plus.feature.tv.home

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.async
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import tv.bayit.plus.core.byoc.BYOCSourceManager
import tv.bayit.plus.core.byoc.models.BYOCContentItem
import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.data.repository.ContentRepository
import tv.bayit.plus.core.data.repository.LiveTVRepository
import tv.bayit.plus.core.data.repository.PodcastRepository
import tv.bayit.plus.core.data.repository.RadioRepository
import tv.bayit.plus.core.model.ContentItem
import javax.inject.Inject

enum class TVRowType {
    HERO,
    LIVE_TV,
    CONTINUE_WATCHING,
    VOD,
    RADIO,
    PODCASTS,
    BYOC,
}

data class TVContentRowData(
    val rowId: String,
    val title: String,
    val items: List<Any>,
    val rowType: TVRowType,
)

sealed interface TVHomeUiState {
    data object Loading : TVHomeUiState
    data class Success(val rows: List<TVContentRowData>) : TVHomeUiState
    data class Error(val message: String) : TVHomeUiState
}

@HiltViewModel
class TVHomeViewModel @Inject constructor(
    private val contentRepository: ContentRepository,
    private val liveTVRepository: LiveTVRepository,
    private val radioRepository: RadioRepository,
    private val podcastRepository: PodcastRepository,
    private val byocSourceManager: BYOCSourceManager,
) : ViewModel() {

    private val _uiState = MutableStateFlow<TVHomeUiState>(TVHomeUiState.Loading)
    val uiState: StateFlow<TVHomeUiState> = _uiState.asStateFlow()

    init {
        loadContent()
    }

    fun refresh() {
        _uiState.value = TVHomeUiState.Loading
        loadContent()
    }

    private fun loadContent() {
        viewModelScope.launch {
            try {
                val featured = async { contentRepository.getFeatured() }
                val continueWatching = async { contentRepository.getContinueWatching() }
                val live = async { liveTVRepository.getChannels() }
                val vod = async { contentRepository.getHomeFeed() }
                val radio = async { radioRepository.getStations() }
                val podcasts = async { podcastRepository.getPodcasts() }

                val byocItems = byocSourceManager.contentItems.value

                val rows = buildRows(
                    featured = (featured.await() as? BayitResult.Success)?.data,
                    continueWatching = (continueWatching.await() as? BayitResult.Success)?.data,
                    live = (live.await() as? BayitResult.Success)?.data,
                    vod = (vod.await() as? BayitResult.Success)?.data,
                    radio = (radio.await() as? BayitResult.Success)?.data,
                    podcasts = (podcasts.await() as? BayitResult.Success)?.data,
                    byoc = byocItems.map { it.toContentItem() },
                )
                _uiState.value = TVHomeUiState.Success(rows)
            } catch (e: Exception) {
                _uiState.value = TVHomeUiState.Error(e.message ?: "Failed to load content")
            }
        }
    }

    private fun buildRows(
        featured: Any?,
        continueWatching: List<*>?,
        live: List<*>?,
        vod: List<*>?,
        radio: List<*>?,
        podcasts: List<*>?,
        byoc: List<ContentItem>?,
    ): List<TVContentRowData> = buildList {
        featured?.let {
            val items = if (it is List<*>) it else listOf(it)
            if (items.isNotEmpty()) {
                add(TVContentRowData("hero", "featured", items.filterNotNull(), TVRowType.HERO))
            }
        }
        continueWatching?.filterNotNull()?.takeIf { it.isNotEmpty() }?.let {
            add(TVContentRowData("continue", "continue_watching", it, TVRowType.CONTINUE_WATCHING))
        }
        live?.filterNotNull()?.takeIf { it.isNotEmpty() }?.let {
            add(TVContentRowData("live", "live_tv", it, TVRowType.LIVE_TV))
        }
        vod?.filterNotNull()?.takeIf { it.isNotEmpty() }?.let {
            add(TVContentRowData("vod", "on_demand", it, TVRowType.VOD))
        }
        radio?.filterNotNull()?.takeIf { it.isNotEmpty() }?.let {
            add(TVContentRowData("radio", "radio_stations", it, TVRowType.RADIO))
        }
        podcasts?.filterNotNull()?.takeIf { it.isNotEmpty() }?.let {
            add(TVContentRowData("podcasts", "podcasts", it, TVRowType.PODCASTS))
        }
        byoc?.takeIf { it.isNotEmpty() }?.let {
            add(TVContentRowData("byoc", "byoc_my_sources", it, TVRowType.BYOC))
        }
    }
}

private fun BYOCContentItem.toContentItem(): ContentItem = ContentItem(
    id = id,
    title = title,
    description = description,
    thumbnail = thumbnailUrl,
    backdrop = backdropUrl,
    contentType = contentType.name.lowercase(),
)

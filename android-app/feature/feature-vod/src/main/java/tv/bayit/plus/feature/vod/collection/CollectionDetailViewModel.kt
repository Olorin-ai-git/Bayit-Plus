package tv.bayit.plus.feature.vod.collection

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.common.i18n.BayitStringProvider
import tv.bayit.plus.core.common.logging.BayitLogger
import tv.bayit.plus.core.data.repository.ContentRepository
import tv.bayit.plus.core.model.CollectionDetail
import tv.bayit.plus.core.model.CollectionMovie
import javax.inject.Inject

/**
 * ViewModel for the Collection Detail screen.
 *
 * Loads collection metadata and movies via [ContentRepository.getCollectionById].
 * The backend returns a [CollectionDetail] with an embedded movies list.
 * Exposes [CollectionDetailUiState] for pattern matching in the Compose layer.
 */
@HiltViewModel
class CollectionDetailViewModel @Inject constructor(
    savedStateHandle: SavedStateHandle,
    private val contentRepository: ContentRepository,
    private val logger: BayitLogger,
    private val stringProvider: BayitStringProvider,
) : ViewModel() {

    private val collectionId: String = checkNotNull(savedStateHandle["collectionId"])

    private val _uiState = MutableStateFlow<CollectionDetailUiState>(CollectionDetailUiState.Loading)
    val uiState: StateFlow<CollectionDetailUiState> = _uiState.asStateFlow()

    init {
        loadCollectionDetail()
    }

    fun retry() {
        _uiState.value = CollectionDetailUiState.Loading
        loadCollectionDetail()
    }

    private fun loadCollectionDetail() {
        viewModelScope.launch {
            logger.debug("Loading collection detail", mapOf("collectionId" to collectionId))

            when (val result = contentRepository.getCollectionById(collectionId)) {
                is BayitResult.Success -> {
                    val detail = result.data as? CollectionDetail
                    if (detail == null) {
                        _uiState.value = CollectionDetailUiState.Error(stringProvider.string("vod.collection.notFound"))
                        return@launch
                    }
                    logger.info("Collection detail loaded", mapOf(
                        "collectionId" to collectionId,
                        "title" to detail.title.orEmpty(),
                        "movieCount" to detail.movies.size.toString(),
                    ))
                    _uiState.value = CollectionDetailUiState.Success(
                        collectionId = detail.id,
                        title = detail.title.orEmpty(),
                        description = detail.localizedPromoText() ?: detail.description,
                        thumbnail = detail.thumbnail,
                        backdrop = detail.backdrop,
                        availableMovies = detail.availableMovies,
                        totalMovies = detail.totalMovies,
                        movies = detail.movies,
                    )
                }
                is BayitResult.Error -> {
                    logger.error("Collection detail load failed", result.exception, mapOf(
                        "collectionId" to collectionId,
                    ))
                    _uiState.value = CollectionDetailUiState.Error(
                        result.message ?: result.exception.message.orEmpty(),
                    )
                }
                is BayitResult.Loading -> Unit
            }
        }
    }
}

sealed interface CollectionDetailUiState {
    data object Loading : CollectionDetailUiState

    data class Success(
        val collectionId: String,
        val title: String,
        val description: String?,
        val thumbnail: String?,
        val backdrop: String?,
        val availableMovies: Int?,
        val totalMovies: Int?,
        val movies: List<CollectionMovie>,
    ) : CollectionDetailUiState

    data class Error(val message: String) : CollectionDetailUiState
}

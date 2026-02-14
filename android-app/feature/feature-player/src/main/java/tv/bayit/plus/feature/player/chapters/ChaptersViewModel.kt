package tv.bayit.plus.feature.player.chapters

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
import tv.bayit.plus.core.data.repository.ChapterRepository
import javax.inject.Inject

@HiltViewModel
class ChaptersViewModel @Inject constructor(
    savedStateHandle: SavedStateHandle,
    private val chapterRepository: ChapterRepository,
    private val logger: BayitLogger,
) : ViewModel() {

    private val contentId: String = checkNotNull(savedStateHandle["contentId"])

    private val _uiState = MutableStateFlow<ChaptersUiState>(ChaptersUiState.Loading)
    val uiState: StateFlow<ChaptersUiState> = _uiState.asStateFlow()

    init {
        loadChapters()
    }

    private fun loadChapters() {
        viewModelScope.launch {
            logger.debug("Loading chapters", mapOf("contentId" to contentId))

            val chaptersResult = chapterRepository.getChapters(contentId)
            val thumbnailsResult = chapterRepository.getChapterThumbnails(contentId)

            val chapters = when (chaptersResult) {
                is BayitResult.Success -> chaptersResult.data
                is BayitResult.Error -> {
                    logger.error("Failed to load chapters", chaptersResult.exception)
                    _uiState.value = ChaptersUiState.Error(
                        message = chaptersResult.message ?: chaptersResult.exception.message.orEmpty(),
                    )
                    return@launch
                }
                is BayitResult.Loading -> return@launch
            }

            val thumbnails = when (thumbnailsResult) {
                is BayitResult.Success -> thumbnailsResult.data
                is BayitResult.Error -> emptyList()
                is BayitResult.Loading -> emptyList()
            }

            logger.info(
                "Chapters loaded",
                mapOf(
                    "contentId" to contentId,
                    "chapterCount" to chapters.size.toString(),
                ),
            )
            _uiState.value = ChaptersUiState.Success(
                chapters = chapters,
                thumbnails = thumbnails,
            )
        }
    }

    fun skipToChapter(chapterIndex: Int) {
        viewModelScope.launch {
            logger.debug(
                "Skipping to chapter",
                mapOf("contentId" to contentId, "chapterIndex" to chapterIndex.toString()),
            )
            when (chapterRepository.skipToChapter(contentId, chapterIndex)) {
                is BayitResult.Success -> {
                    logger.info("Skipped to chapter", mapOf("chapterIndex" to chapterIndex.toString()))
                }
                is BayitResult.Error -> {
                    logger.error("Failed to skip to chapter")
                }
                is BayitResult.Loading -> Unit
            }
        }
    }

    fun retry() {
        _uiState.value = ChaptersUiState.Loading
        loadChapters()
    }
}

sealed interface ChaptersUiState {
    data object Loading : ChaptersUiState

    data class Success(
        val chapters: List<Any>,
        val thumbnails: List<Any>,
    ) : ChaptersUiState

    data class Error(val message: String) : ChaptersUiState
}

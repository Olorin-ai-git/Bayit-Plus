package tv.bayit.plus.feature.audiobooks.detail

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
import tv.bayit.plus.core.data.repository.AudiobookRepository
import tv.bayit.plus.core.model.Audiobook
import tv.bayit.plus.core.model.AudiobookChapter
import javax.inject.Inject

/**
 * ViewModel for the Audiobook Detail screen.
 *
 * Loads audiobook metadata via [AudiobookRepository.getAudiobook] and
 * chapters via [AudiobookRepository.getChapters]. Loads bookmarks for
 * displaying user progress indicators. Exposes [AudiobookDetailUiState]
 * for pattern matching in the Compose layer.
 */
@HiltViewModel
class AudiobookDetailViewModel @Inject constructor(
    savedStateHandle: SavedStateHandle,
    private val audiobookRepository: AudiobookRepository,
    private val stringProvider: BayitStringProvider,
    private val logger: BayitLogger,
) : ViewModel() {

    private val audiobookId: String = checkNotNull(savedStateHandle["audiobookId"])

    private val _uiState = MutableStateFlow<AudiobookDetailUiState>(AudiobookDetailUiState.Loading)
    val uiState: StateFlow<AudiobookDetailUiState> = _uiState.asStateFlow()

    init {
        loadAudiobookDetail()
    }

    fun retry() {
        _uiState.value = AudiobookDetailUiState.Loading
        loadAudiobookDetail()
    }

    private fun loadAudiobookDetail() {
        viewModelScope.launch {
            logger.debug("Loading audiobook detail", mapOf("audiobookId" to audiobookId))

            when (val result = audiobookRepository.getAudiobook(audiobookId)) {
                is BayitResult.Success -> {
                    val audiobook = result.data as? Audiobook
                    if (audiobook == null) {
                        _uiState.value = AudiobookDetailUiState.Error(stringProvider.string("error.audiobooks.notFound"))
                        return@launch
                    }
                    logger.info("Audiobook detail loaded", mapOf(
                        "audiobookId" to audiobookId,
                        "title" to audiobook.title.orEmpty(),
                    ))
                    _uiState.value = AudiobookDetailUiState.Success(
                        audiobookId = audiobook.id,
                        title = audiobook.title.orEmpty(),
                        author = audiobook.author,
                        narrator = audiobook.narrator,
                        description = audiobook.description,
                        thumbnail = audiobook.thumbnail,
                        backdrop = audiobook.backdrop,
                        duration = audiobook.duration,
                        chapters = audiobook.chapters.orEmpty(),
                        isLoadingChapters = audiobook.chapters.isNullOrEmpty(),
                        bookmarkCount = 0,
                    )
                    if (audiobook.chapters.isNullOrEmpty()) {
                        loadChapters()
                    }
                    loadBookmarkCount()
                }
                is BayitResult.Error -> {
                    logger.error("Audiobook detail load failed", result.exception, mapOf(
                        "audiobookId" to audiobookId,
                    ))
                    _uiState.value = AudiobookDetailUiState.Error(
                        result.message ?: result.exception.message.orEmpty(),
                    )
                }
                is BayitResult.Loading -> Unit
            }
        }
    }

    private fun loadChapters() {
        viewModelScope.launch {
            logger.debug("Loading audiobook chapters", mapOf("audiobookId" to audiobookId))

            when (val result = audiobookRepository.getChapters(audiobookId)) {
                is BayitResult.Success -> {
                    @Suppress("UNCHECKED_CAST")
                    val chapters = (result.data as List<Any>).filterIsInstance<AudiobookChapter>()
                    logger.info("Audiobook chapters loaded", mapOf(
                        "audiobookId" to audiobookId,
                        "chapterCount" to chapters.size.toString(),
                    ))
                    val current = _uiState.value as? AudiobookDetailUiState.Success ?: return@launch
                    _uiState.value = current.copy(
                        chapters = chapters,
                        isLoadingChapters = false,
                    )
                }
                is BayitResult.Error -> {
                    logger.error("Audiobook chapters load failed", result.exception, mapOf(
                        "audiobookId" to audiobookId,
                    ))
                    val current = _uiState.value as? AudiobookDetailUiState.Success ?: return@launch
                    _uiState.value = current.copy(isLoadingChapters = false)
                }
                is BayitResult.Loading -> Unit
            }
        }
    }

    private fun loadBookmarkCount() {
        viewModelScope.launch {
            when (val result = audiobookRepository.getBookmarks(audiobookId)) {
                is BayitResult.Success -> {
                    val bookmarks = result.data as? List<*>
                    val current = _uiState.value as? AudiobookDetailUiState.Success ?: return@launch
                    _uiState.value = current.copy(bookmarkCount = bookmarks?.size ?: 0)
                }
                is BayitResult.Error -> {
                    logger.warning("Bookmark count load failed", mapOf(
                        "audiobookId" to audiobookId,
                    ))
                }
                is BayitResult.Loading -> Unit
            }
        }
    }
}

sealed interface AudiobookDetailUiState {
    data object Loading : AudiobookDetailUiState

    data class Success(
        val audiobookId: String,
        val title: String,
        val author: String?,
        val narrator: String?,
        val description: String?,
        val thumbnail: String?,
        val backdrop: String?,
        val duration: String?,
        val chapters: List<AudiobookChapter>,
        val isLoadingChapters: Boolean,
        val bookmarkCount: Int,
    ) : AudiobookDetailUiState

    data class Error(val message: String) : AudiobookDetailUiState
}

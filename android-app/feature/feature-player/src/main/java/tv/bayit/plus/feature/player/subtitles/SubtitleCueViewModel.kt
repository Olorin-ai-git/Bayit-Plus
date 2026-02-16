package tv.bayit.plus.feature.player.subtitles

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.common.logging.BayitLogger
import tv.bayit.plus.core.data.repository.SubtitleRepository
import tv.bayit.plus.core.model.SubtitleCue
import tv.bayit.plus.core.model.SubtitleEnglishMode
import tv.bayit.plus.core.model.SubtitleHebrewMode
import tv.bayit.plus.core.model.TranslationResult
import javax.inject.Inject

/**
 * Manages cue-based interactive subtitles for the player overlay.
 *
 * Loads subtitle cues from the API, tracks the active cue by playback position,
 * handles word-level translation requests, and manages Hebrew/English display modes.
 */
@HiltViewModel
class SubtitleCueViewModel @Inject constructor(
    private val subtitleRepository: SubtitleRepository,
    private val logger: BayitLogger,
) : ViewModel() {

    private val _cues = MutableStateFlow<List<SubtitleCue>>(emptyList())
    val cues: StateFlow<List<SubtitleCue>> = _cues.asStateFlow()

    private val _activeCue = MutableStateFlow<SubtitleCue?>(null)
    val activeCue: StateFlow<SubtitleCue?> = _activeCue.asStateFlow()

    private val _hebrewMode = MutableStateFlow(SubtitleHebrewMode.STANDARD)
    val hebrewMode: StateFlow<SubtitleHebrewMode> = _hebrewMode.asStateFlow()

    private val _englishMode = MutableStateFlow(SubtitleEnglishMode.STANDARD)
    val englishMode: StateFlow<SubtitleEnglishMode> = _englishMode.asStateFlow()

    private val _selectedLanguage = MutableStateFlow("he")
    val selectedLanguage: StateFlow<String> = _selectedLanguage.asStateFlow()

    private val _translationResult = MutableStateFlow<TranslationResult?>(null)
    val translationResult: StateFlow<TranslationResult?> = _translationResult.asStateFlow()

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    private val _isSplitMode = MutableStateFlow(false)
    val isSplitMode: StateFlow<Boolean> = _isSplitMode.asStateFlow()

    private val _splitLanguage = MutableStateFlow("en")
    val splitLanguage: StateFlow<String> = _splitLanguage.asStateFlow()

    private var currentContentId: String? = null

    fun loadCues(contentId: String, language: String) {
        currentContentId = contentId
        _selectedLanguage.value = language
        _isLoading.value = true

        viewModelScope.launch {
            logger.debug("Loading subtitle cues", mapOf(
                "contentId" to contentId,
                "language" to language,
            ))

            val result = subtitleRepository.fetchCues(
                contentId = contentId,
                language = language,
                hebrewMode = if (language == "he") _hebrewMode.value else null,
                englishMode = if (language == "en") _englishMode.value else null,
            )

            when (result) {
                is BayitResult.Success -> {
                    _cues.value = result.data.cues.orEmpty()
                    logger.info("Subtitle cues loaded", mapOf(
                        "count" to _cues.value.size.toString(),
                    ))
                }
                is BayitResult.Error -> {
                    logger.error("Failed to load subtitle cues", result.exception)
                    _cues.value = emptyList()
                }
                is BayitResult.Loading -> Unit
            }
            _isLoading.value = false
        }
    }

    fun updatePlaybackPosition(positionMs: Long) {
        val positionSec = positionMs / 1000.0
        val active = _cues.value.find { cue ->
            val start = cue.startTime ?: return@find false
            val end = cue.endTime ?: return@find false
            positionSec in start..end
        }
        _activeCue.value = active
    }

    fun selectLanguage(language: String) {
        val contentId = currentContentId ?: return
        _selectedLanguage.value = language
        _translationResult.value = null
        loadCues(contentId, language)
    }

    fun setHebrewMode(mode: SubtitleHebrewMode) {
        _hebrewMode.value = mode
        val contentId = currentContentId ?: return
        if (_selectedLanguage.value == "he") loadCues(contentId, "he")
    }

    fun setEnglishMode(mode: SubtitleEnglishMode) {
        _englishMode.value = mode
        val contentId = currentContentId ?: return
        if (_selectedLanguage.value == "en") loadCues(contentId, "en")
    }

    fun translateWord(word: String) {
        val sourceLang = _selectedLanguage.value
        val targetLang = if (sourceLang == "he") "en" else "he"

        viewModelScope.launch {
            when (val result = subtitleRepository.translateWord(word, sourceLang, targetLang)) {
                is BayitResult.Success -> _translationResult.value = result.data
                is BayitResult.Error -> logger.error("Translation failed", result.exception)
                is BayitResult.Loading -> Unit
            }
        }
    }

    fun dismissTranslation() {
        _translationResult.value = null
    }

    fun toggleSplitMode() {
        _isSplitMode.value = !_isSplitMode.value
    }

    fun setSplitLanguage(language: String) {
        _splitLanguage.value = language
    }
}

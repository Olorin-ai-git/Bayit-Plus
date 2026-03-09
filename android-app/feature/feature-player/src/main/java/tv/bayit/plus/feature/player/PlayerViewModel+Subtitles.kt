package tv.bayit.plus.feature.player

import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.model.ImportedTrack
import tv.bayit.plus.core.model.SplitSubtitleLayout
import tv.bayit.plus.core.model.SubtitleEnglishMode
import tv.bayit.plus.core.model.SubtitleHebrewMode

/** Returns the backend content ID for BYOC items, or the local content ID otherwise. */
private val PlayerViewModel.subtitleContentId: String?
    get() = _extendedState.value.byocBackendContentId ?: currentContentId

private val PlayerViewModel.isBYOC: Boolean
    get() = currentContentType == PlayerContentResolver.CONTENT_TYPE_BYOC

fun PlayerViewModel.selectSubtitleLanguage(code: String) =
    subtitleDelegate.selectLanguage(code, subtitleContentId, viewModelScope) { t -> _extendedState.update(t) }

fun PlayerViewModel.toggleSubtitles() {
    _extendedState.update { it.copy(isSubtitlesEnabled = !it.isSubtitlesEnabled) }
}

fun PlayerViewModel.toggleSplitSubtitleMode() {
    _extendedState.update { it.copy(isSplitSubtitleMode = !it.isSplitSubtitleMode) }
}

fun PlayerViewModel.selectPrimarySubtitleLanguage(code: String) =
    subtitleDelegate.selectPrimaryLanguage(code, subtitleContentId, viewModelScope) { t -> _extendedState.update(t) }

fun PlayerViewModel.selectSecondarySubtitleLanguage(code: String) =
    subtitleDelegate.selectSecondaryLanguage(code, subtitleContentId, viewModelScope) { t -> _extendedState.update(t) }

fun PlayerViewModel.selectSplitSubtitleLayout(layout: SplitSubtitleLayout) {
    _extendedState.update { it.copy(splitSubtitleLayout = layout) }
}

fun PlayerViewModel.fetchExternalSubtitles() {
    if (isBYOC) {
        fetchBYOCExternalSubtitles()
        return
    }
    subtitleContentId?.let { subtitleDelegate.fetchExternal(it, viewModelScope) { t -> _extendedState.update(t) } }
}

/**
 * For BYOC content, always uses the enrichment endpoint (not the regular
 * fetch-external endpoint). Enrichment creates a Content document on the
 * backend and fetches subtitles from the Bayit library + OpenSubtitles.
 * After enrichment completes, reloads subtitle tracks using the backend ID.
 */
private fun PlayerViewModel.fetchBYOCExternalSubtitles() {
    val contentId = currentContentId ?: return
    val title = (uiState.value as? PlayerUiState.Ready)?.title.orEmpty()
    _extendedState.update { it.copy(isLoadingExternalSubtitles = true) }
    byocSubtitleEnricher.enrichSubtitles(
        contentId = contentId,
        contentTitle = title,
        scope = viewModelScope,
        onSubtitleAdded = { event ->
            _extendedState.update {
                it.copy(subtitleBannerMessage = "Added ${event.languageName} subtitles to ${event.contentTitle}")
            }
        },
        onLanguagesUpdated = { langs ->
            _extendedState.update { it.copy(availableSubtitleLanguages = langs) }
        },
        onBackendContentId = { id ->
            _extendedState.update { it.copy(byocBackendContentId = id) }
            subtitleDelegate.loadAvailableSubtitles(id, viewModelScope) { t -> _extendedState.update(t) }
        },
        onComplete = {
            _extendedState.update { it.copy(isLoadingExternalSubtitles = false, shouldDismissOpenSubtitles = true) }
        },
    )
}

fun PlayerViewModel.selectExternalSubtitle(track: ImportedTrack) {
    _extendedState.update { it.copy(selectedSubtitleLanguage = track.language, isSubtitlesEnabled = true) }
}

fun PlayerViewModel.setHebrewSubtitleMode(mode: SubtitleHebrewMode) {
    _extendedState.update { it.copy(hebrewMode = mode) }
    val contentId = subtitleContentId ?: return
    val lang = _extendedState.value.selectedSubtitleLanguage ?: "he"
    if (mode != SubtitleHebrewMode.STANDARD) {
        triggerAIGeneration(contentId, lang, mode, null)
    }
    subtitleDelegate.loadTrackWithMode(contentId, lang, mode, null, viewModelScope) { t -> _extendedState.update(t) }
}

fun PlayerViewModel.setEnglishSubtitleMode(mode: SubtitleEnglishMode) {
    _extendedState.update { it.copy(englishMode = mode) }
    val contentId = subtitleContentId ?: return
    val lang = _extendedState.value.selectedSubtitleLanguage ?: "en"
    if (mode != SubtitleEnglishMode.STANDARD) {
        triggerAIGeneration(contentId, lang, null, mode)
    }
    subtitleDelegate.loadTrackWithMode(contentId, lang, null, mode, viewModelScope) { t -> _extendedState.update(t) }
}

private fun PlayerViewModel.triggerAIGeneration(
    contentId: String,
    language: String,
    hebrewMode: SubtitleHebrewMode?,
    englishMode: SubtitleEnglishMode?,
) {
    _extendedState.update { it.copy(isGeneratingAISubtitles = true) }
    viewModelScope.launch {
        val repo = subtitleDelegate.subtitleRepository
        val result: BayitResult<Any> = when {
            hebrewMode == SubtitleHebrewMode.NIKUD -> repo.generateNikud(contentId, language, false)
            hebrewMode == SubtitleHebrewMode.SHORESH -> repo.generateShoresh(contentId, language, false)
            hebrewMode == SubtitleHebrewMode.HEBLISH -> repo.generateHeblish(contentId, language, false)
            englishMode == SubtitleEnglishMode.ENGREW -> repo.generateEngrew(contentId, language, false)
            else -> return@launch
        }
        _extendedState.update { it.copy(isGeneratingAISubtitles = false) }
        if (result is BayitResult.Success) {
            subtitleDelegate.loadTrackWithMode(
                contentId, language, hebrewMode, englishMode, viewModelScope,
            ) { t -> _extendedState.update(t) }
        }
    }
}

fun PlayerViewModel.dismissSubtitleBanner() {
    _extendedState.update { it.copy(subtitleBannerMessage = null) }
}

package tv.bayit.plus.feature.player

import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.flow.update
import tv.bayit.plus.core.model.ImportedTrack
import tv.bayit.plus.core.model.SplitSubtitleLayout

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

fun PlayerViewModel.dismissSubtitleBanner() {
    _extendedState.update { it.copy(subtitleBannerMessage = null) }
}

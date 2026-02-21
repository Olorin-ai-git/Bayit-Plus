package tv.bayit.plus.feature.player

import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.flow.update
import tv.bayit.plus.core.model.ImportedTrack
import tv.bayit.plus.core.model.SplitSubtitleLayout

fun PlayerViewModel.selectSubtitleLanguage(code: String) =
    subtitleDelegate.selectLanguage(code, currentContentId, viewModelScope) { t -> _extendedState.update(t) }

fun PlayerViewModel.toggleSubtitles() {
    _extendedState.update { it.copy(isSubtitlesEnabled = !it.isSubtitlesEnabled) }
}

fun PlayerViewModel.toggleSplitSubtitleMode() {
    _extendedState.update { it.copy(isSplitSubtitleMode = !it.isSplitSubtitleMode) }
}

fun PlayerViewModel.selectPrimarySubtitleLanguage(code: String) =
    subtitleDelegate.selectPrimaryLanguage(code, currentContentId, viewModelScope) { t -> _extendedState.update(t) }

fun PlayerViewModel.selectSecondarySubtitleLanguage(code: String) =
    subtitleDelegate.selectSecondaryLanguage(code, currentContentId, viewModelScope) { t -> _extendedState.update(t) }

fun PlayerViewModel.selectSplitSubtitleLayout(layout: SplitSubtitleLayout) {
    _extendedState.update { it.copy(splitSubtitleLayout = layout) }
}

fun PlayerViewModel.fetchExternalSubtitles() =
    currentContentId?.let { subtitleDelegate.fetchExternal(it, viewModelScope) { t -> _extendedState.update(t) } }

fun PlayerViewModel.selectExternalSubtitle(track: ImportedTrack) {
    _extendedState.update { it.copy(selectedSubtitleLanguage = track.language, isSubtitlesEnabled = true) }
}

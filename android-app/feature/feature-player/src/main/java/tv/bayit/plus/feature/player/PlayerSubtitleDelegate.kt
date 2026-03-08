package tv.bayit.plus.feature.player

import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.launch
import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.common.logging.BayitLogger
import tv.bayit.plus.core.data.repository.SubtitleRepository
import tv.bayit.plus.core.model.SubtitleCue
import javax.inject.Inject

/**
 * Handles subtitle loading, language selection, split-mode, and external-subtitle
 * operations for [PlayerViewModel].
 *
 * All state mutations are expressed as [PlayerExtendedState] → [PlayerExtendedState]
 * transformers so the caller can apply them atomically to its StateFlow.
 */
class PlayerSubtitleDelegate @Inject constructor(
    private val subtitleRepository: SubtitleRepository,
    private val logger: BayitLogger,
) {
    fun loadAvailableSubtitles(
        contentId: String,
        scope: CoroutineScope,
        update: (PlayerExtendedState.() -> PlayerExtendedState) -> Unit,
    ) {
        scope.launch {
            when (val result = subtitleRepository.getAvailableSubtitles(contentId)) {
                is BayitResult.Success -> {
                    val langs = result.data.map { it.language }.distinct()
                    update { copy(availableSubtitleLanguages = langs) }
                    logger.debug("Loaded available subtitles", mapOf("languages" to langs.joinToString()))
                }
                is BayitResult.Error -> logger.error("Failed to load subtitles", result.exception)
                is BayitResult.Loading -> Unit
            }
        }
    }

    fun selectLanguage(
        languageCode: String,
        contentId: String?,
        scope: CoroutineScope,
        update: (PlayerExtendedState.() -> PlayerExtendedState) -> Unit,
    ) {
        update { copy(selectedSubtitleLanguage = languageCode, isSubtitlesEnabled = true) }
        logger.debug("Selected subtitle language", mapOf("language" to languageCode))
        contentId?.let { loadTrack(it, languageCode, scope, update, primary = null) }
    }

    fun selectPrimaryLanguage(
        languageCode: String,
        contentId: String?,
        scope: CoroutineScope,
        update: (PlayerExtendedState.() -> PlayerExtendedState) -> Unit,
    ) {
        update { copy(primarySubtitleLanguage = languageCode, isSplitSubtitleMode = true, isSubtitlesEnabled = true) }
        logger.debug("Selected primary subtitle language", mapOf("language" to languageCode))
        contentId?.let { loadTrack(it, languageCode, scope, update, primary = true) }
    }

    fun selectSecondaryLanguage(
        languageCode: String,
        contentId: String?,
        scope: CoroutineScope,
        update: (PlayerExtendedState.() -> PlayerExtendedState) -> Unit,
    ) {
        update { copy(secondarySubtitleLanguage = languageCode, isSplitSubtitleMode = true, isSubtitlesEnabled = true) }
        logger.debug("Selected secondary subtitle language", mapOf("language" to languageCode))
        contentId?.let { loadTrack(it, languageCode, scope, update, primary = false) }
    }

    fun fetchExternal(
        contentId: String,
        scope: CoroutineScope,
        update: (PlayerExtendedState.() -> PlayerExtendedState) -> Unit,
    ) {
        scope.launch {
            update { copy(isLoadingExternalSubtitles = true) }
            when (val result = subtitleRepository.fetchExternalSubtitles(contentId)) {
                is BayitResult.Success -> {
                    update { copy(externalSubtitleTracks = result.data.tracks, isLoadingExternalSubtitles = false) }
                    logger.info("Fetched external subtitles", mapOf("count" to result.data.tracks.size.toString(), "provider" to (result.data.provider ?: "unknown")))
                }
                is BayitResult.Error -> {
                    update { copy(isLoadingExternalSubtitles = false) }
                    logger.error("Failed to fetch external subtitles", result.exception)
                }
                is BayitResult.Loading -> Unit
            }
        }
    }

    fun translateWord(
        word: String,
        sourceLanguage: String,
        targetLanguage: String,
        scope: CoroutineScope,
        update: (PlayerExtendedState.() -> PlayerExtendedState) -> Unit,
    ) {
        update { copy(isTranslating = true) }
        scope.launch {
            when (val result = subtitleRepository.translateWord(word, sourceLanguage, targetLanguage)) {
                is BayitResult.Success -> {
                    update { copy(translationResult = result.data, isTranslating = false) }
                    logger.debug("Word translated", mapOf("word" to word, "target" to targetLanguage))
                }
                is BayitResult.Error -> {
                    update { copy(isTranslating = false) }
                    logger.error("Failed to translate word", result.exception)
                }
                is BayitResult.Loading -> Unit
            }
        }
    }

    fun dismissTranslation(
        update: (PlayerExtendedState.() -> PlayerExtendedState) -> Unit,
    ) {
        update { copy(translationResult = null) }
    }

    /** Pure function: finds the active cue at [positionSeconds] from [cues]. */
    fun findCueAtPosition(cues: List<SubtitleCue>, positionSeconds: Double): SubtitleCue? =
        cues.firstOrNull { cue ->
            val start = cue.startTime ?: return@firstOrNull false
            val end = cue.endTime ?: return@firstOrNull false
            positionSeconds >= start && positionSeconds <= end
        }

    /** Returns an updated [PlayerExtendedState] reflecting the active cue(s) at [positionMs]. */
    fun updateActiveCue(positionMs: Long, state: PlayerExtendedState): PlayerExtendedState {
        if (!state.isSubtitlesEnabled) {
            return if (state.activeCue != null || state.activePrimaryCue != null || state.activeSecondaryCue != null) {
                state.copy(activeCue = null, activePrimaryCue = null, activeSecondaryCue = null)
            } else state
        }
        val posSeconds = positionMs / 1000.0
        return if (state.isSplitSubtitleMode) {
            val primary = findCueAtPosition(state.primarySubtitleCues, posSeconds)
            val secondary = findCueAtPosition(state.secondarySubtitleCues, posSeconds)
            if (primary != state.activePrimaryCue || secondary != state.activeSecondaryCue) {
                state.copy(activePrimaryCue = primary, activeSecondaryCue = secondary)
            } else state
        } else {
            val active = findCueAtPosition(state.loadedSubtitleCues, posSeconds)
            if (active != state.activeCue) state.copy(activeCue = active) else state
        }
    }

    private fun loadTrack(
        contentId: String,
        languageCode: String,
        scope: CoroutineScope,
        update: (PlayerExtendedState.() -> PlayerExtendedState) -> Unit,
        primary: Boolean?,
    ) {
        scope.launch {
            when (val result = subtitleRepository.fetchCues(contentId, languageCode, null, null)) {
                is BayitResult.Success -> {
                    val cues = result.data.cues ?: emptyList()
                    when (primary) {
                        null -> update { copy(loadedSubtitleCues = cues) }
                        true -> update { copy(primarySubtitleCues = cues) }
                        false -> update { copy(secondarySubtitleCues = cues) }
                    }
                    logger.debug("Loaded subtitle cues", mapOf("language" to languageCode, "cueCount" to cues.size.toString()))
                }
                is BayitResult.Error -> logger.error("Failed to load subtitle cues", result.exception)
                is BayitResult.Loading -> Unit
            }
        }
    }
}

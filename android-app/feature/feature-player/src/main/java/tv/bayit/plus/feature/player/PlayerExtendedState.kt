package tv.bayit.plus.feature.player

import tv.bayit.plus.core.model.TriviaFact
import tv.bayit.plus.feature.player.chapters.ChapterMarker

/**
 * Extended player state for recording, PiP, and chapter features.
 *
 * Separated from [PlayerUiState] to keep the primary UI state
 * focused on core playback while this tracks optional features.
 */
data class PlayerExtendedState(
    val isRecording: Boolean = false,
    val recordingStartTimeMs: Long? = null,
    val isInPictureInPicture: Boolean = false,
    val chapters: List<ChapterMarker> = emptyList(),
    val currentChapterIndex: Int = -1,
    val selectedQualityHeight: Int? = null,
    val playbackSpeed: Float = 1.0f,
    val availableSubtitleLanguages: List<String> = emptyList(),
    val selectedSubtitleLanguage: String? = null,
    val isSubtitlesEnabled: Boolean = false,
    val isSplitSubtitleMode: Boolean = false,
    val splitSubtitleLayout: tv.bayit.plus.core.model.SplitSubtitleLayout = tv.bayit.plus.core.model.SplitSubtitleLayout.STACKED,
    val primarySubtitleLanguage: String? = null,
    val secondarySubtitleLanguage: String? = null,
    val externalSubtitleTracks: List<tv.bayit.plus.core.model.ImportedTrack> = emptyList(),
    val isLoadingExternalSubtitles: Boolean = false,
    val loadedSubtitleCues: List<tv.bayit.plus.core.model.SubtitleCue> = emptyList(),
    val activeCue: tv.bayit.plus.core.model.SubtitleCue? = null,
    val primarySubtitleCues: List<tv.bayit.plus.core.model.SubtitleCue> = emptyList(),
    val secondarySubtitleCues: List<tv.bayit.plus.core.model.SubtitleCue> = emptyList(),
    val activePrimaryCue: tv.bayit.plus.core.model.SubtitleCue? = null,
    val activeSecondaryCue: tv.bayit.plus.core.model.SubtitleCue? = null,
    val vodTriviaFact: TriviaFact? = null,
    val isVodTriviaEnabled: Boolean = true,
    val vodTriviaLanguage: String = "en",
    val volume: Float = 1.0f,
    val isSleepTimerActive: Boolean = false,
    val sleepTimerRemainingSeconds: Int = 0,
    val sleepTimerDurationMinutes: Int? = null,
    val isSpecialUser: Boolean = false,
    val showOmriOverlay: Boolean = false,
    val hasTriggeredOmriOverlay: Boolean = false,
    val isFullscreen: Boolean = true,
    val interactiveMoments: List<tv.bayit.plus.feature.player.dialogue.InteractiveMoment> = emptyList(),
    val vodInteractionCharacters: List<tv.bayit.plus.feature.player.dialogue.ContentCharacter> = emptyList(),
    val showVodInteractionSheet: Boolean = false,
    /** Profile ID of the currently authenticated user; populated on content load. */
    val profileId: String? = null,
    /** Creatify avatar ID for the current user; populated on first interaction attempt. */
    val avatarId: String? = null,
    /** Avatar image URL for the current user's ready persona; used in dialogue overlay header. */
    val avatarImageUrl: String? = null,
    /** Whether the user's Creatify persona has a cloned voice available. */
    val hasVoiceClone: Boolean = false,
    /** Whether the pause-ask dialogue overlay should be displayed. */
    val showPauseAskOverlay: Boolean = false,
    /** Currently active interactive moment triggered by playback position. */
    val activeMoment: tv.bayit.plus.feature.player.dialogue.InteractiveMoment? = null,
    /** Timestamps of moments already triggered during this session to avoid re-triggering. */
    val triggeredMomentTimestamps: Set<Double> = emptySet(),
)

package tv.bayit.plus.feature.player

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
)

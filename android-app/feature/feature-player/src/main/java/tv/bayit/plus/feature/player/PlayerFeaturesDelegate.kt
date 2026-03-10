package tv.bayit.plus.feature.player

import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.launch
import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.common.logging.BayitLogger
import tv.bayit.plus.core.common.time.TimeProvider
import tv.bayit.plus.core.data.repository.UserRepository
import tv.bayit.plus.core.model.ProfileResponse
import tv.bayit.plus.feature.player.dialogue.ContentCharacter
import tv.bayit.plus.feature.player.dialogue.InteractiveMoment
import tv.bayit.plus.feature.player.dialogue.VODInteractionApi
import javax.inject.Inject

/**
 * Handles VOD interactive moments, avatar-based VOD interaction, recording, and
 * special-user detection for [PlayerViewModel].
 */
class PlayerFeaturesDelegate @Inject constructor(
    private val userRepository: UserRepository,
    private val vodInteractionApi: VODInteractionApi,
    private val timeProvider: TimeProvider,
    private val logger: BayitLogger,
) {
    fun checkSpecialUser(
        scope: CoroutineScope,
        update: (PlayerExtendedState.() -> PlayerExtendedState) -> Unit,
    ) {
        scope.launch {
            val result = userRepository.getCurrentUser()
            if (result is BayitResult.Success) {
                val profile = result.data as? ProfileResponse
                update { copy(isSpecialUser = profile?.role == ADMIN_ROLE, profileId = profile?.id) }
            }
        }
    }

    fun loadInteractiveMoments(
        contentId: String,
        scope: CoroutineScope,
        update: (PlayerExtendedState.() -> PlayerExtendedState) -> Unit,
    ) {
        scope.launch {
            val moments = runCatching { vodInteractionApi.getInteractiveMoments(contentId) }
                .onFailure { error ->
                    logger.error(
                        "Failed to load interactive moments",
                        error,
                        mapOf("contentId" to contentId),
                    )
                }
                .getOrElse { emptyList() }
            update { copy(interactiveMoments = moments) }
            logger.debug("Loaded interactive moments", mapOf("contentId" to contentId, "count" to moments.size.toString()))
        }
    }

    /**
     * Pre-fetches avatar status for the current user and stores the result in
     * [PlayerExtendedState] so that auto-triggered [InteractiveMoment] overlays
     * can display the user's avatar image without waiting for a manual interaction.
     *
     * Mirrors the iOS `initializeInteractiveMoments()` avatar-status check.
     */
    fun loadAvatarInfo(
        scope: CoroutineScope,
        update: (PlayerExtendedState.() -> PlayerExtendedState) -> Unit,
    ) {
        scope.launch {
            val status = runCatching { vodInteractionApi.getAvatarStatus("any") }
                .onFailure { error ->
                    logger.warning("Could not fetch avatar status for moment prerequisites", mapOf("error" to (error.message ?: "unknown")))
                }
                .getOrNull()
            if (status?.status == "ready" && status.avatarImageUrl != null) {
                update {
                    copy(
                        avatarId = status.avatarId,
                        avatarImageUrl = status.avatarImageUrl,
                        hasVoiceClone = status.hasVoiceClone,
                    )
                }
                logger.debug("Avatar info loaded for moment prerequisites", mapOf("avatarId" to status.avatarId))
            }
        }
    }

    fun navigateToPreviousInteraction(
        currentPositionMs: Long,
        state: PlayerExtendedState,
        seekTo: (Long) -> Unit,
    ) {
        val posSeconds = currentPositionMs / 1000.0
        val target = state.interactiveMoments.sortedBy { it.timestamp }
            .lastOrNull { it.timestamp < posSeconds - INTERACTION_REWIND_THRESHOLD_S }?.timestamp ?: return
        seekTo(((target - INTERACTION_SEEK_OFFSET_S).coerceAtLeast(0.0) * 1000).toLong())
        logger.debug("Navigated to previous interaction", mapOf("targetTimestamp" to target.toString()))
    }

    fun navigateToNextInteraction(
        currentPositionMs: Long,
        state: PlayerExtendedState,
        seekTo: (Long) -> Unit,
    ) {
        val posSeconds = currentPositionMs / 1000.0
        val target = state.interactiveMoments.sortedBy { it.timestamp }
            .firstOrNull { it.timestamp > posSeconds }?.timestamp ?: return
        seekTo(((target - INTERACTION_SEEK_OFFSET_S).coerceAtLeast(0.0) * 1000).toLong())
        logger.debug("Navigated to next interaction", mapOf("targetTimestamp" to target.toString()))
    }

    fun startVodInteraction(
        contentId: String,
        scope: CoroutineScope,
        pausePlayback: () -> Unit,
        update: (PlayerExtendedState.() -> PlayerExtendedState) -> Unit,
    ) {
        scope.launch {
            val avatarStatus = runCatching { vodInteractionApi.getAvatarStatus("any") }.getOrNull()
            if (avatarStatus == null || avatarStatus.status != "ready" || avatarStatus.avatarImageUrl == null) {
                logger.info("Avatar not ready, skipping VOD interaction", mapOf("contentId" to contentId, "avatarStatus" to (avatarStatus?.status ?: "null")))
                return@launch
            }
            val characters = runCatching { vodInteractionApi.getInteractiveCharacters(contentId) }.getOrElse { emptyList<ContentCharacter>() }
            pausePlayback()
            update {
                copy(
                    vodInteractionCharacters = characters,
                    showVodInteractionSheet = true,
                    avatarId = avatarStatus.avatarId,
                    avatarImageUrl = avatarStatus.avatarImageUrl,
                )
            }
            logger.debug("Started VOD interaction", mapOf("contentId" to contentId, "characters" to characters.size.toString()))
        }
    }

    fun startPauseAndAsk(
        contentId: String,
        scope: CoroutineScope,
        pausePlayback: () -> Unit,
        update: (PlayerExtendedState.() -> PlayerExtendedState) -> Unit,
    ) {
        scope.launch {
            val avatarStatus = runCatching { vodInteractionApi.getAvatarStatus("any") }.getOrNull()
            if (avatarStatus == null || avatarStatus.status != "ready" || avatarStatus.avatarImageUrl == null) {
                logger.info("Avatar not ready, skipping pause-and-ask", mapOf("contentId" to contentId, "avatarStatus" to (avatarStatus?.status ?: "null")))
                return@launch
            }
            val characters = runCatching { vodInteractionApi.getInteractiveCharacters(contentId) }.getOrElse { emptyList<ContentCharacter>() }
            pausePlayback()
            update {
                copy(
                    vodInteractionCharacters = characters,
                    showPauseAskOverlay = true,
                    avatarId = avatarStatus.avatarId,
                    avatarImageUrl = avatarStatus.avatarImageUrl,
                )
            }
            logger.debug("Started pause-and-ask", mapOf("contentId" to contentId, "characters" to characters.size.toString()))
        }
    }

    fun toggleRecording(
        state: PlayerExtendedState,
        contentId: String?,
        update: (PlayerExtendedState.() -> PlayerExtendedState) -> Unit,
    ) {
        val meta = mapOf("contentId" to contentId.orEmpty())
        update {
            if (state.isRecording) {
                logger.info("Recording stopped", meta)
                copy(isRecording = false, recordingStartTimeMs = null)
            } else {
                logger.info("Recording started", meta)
                copy(isRecording = true, recordingStartTimeMs = timeProvider.currentTimeMillis())
            }
        }
    }

    /**
     * Checks whether the current playback position falls within an interactive
     * moment that hasn't been triggered yet during this session.
     *
     * @return the [InteractiveMoment] to activate, or null if none match.
     */
    fun checkMomentAtPosition(
        positionMs: Long,
        state: PlayerExtendedState,
    ): InteractiveMoment? {
        if (state.interactiveMoments.isEmpty()) return null
        val posSeconds = positionMs / MILLIS_PER_SECOND
        return state.interactiveMoments.firstOrNull { moment ->
            // Guard: only trigger moments that have a lipsync video ready (iOS parity).
            // Moments without a lipsync video are structurally complete per is_complete but
            // have no visual content to display — triggering them silently breaks UX.
            moment.lipsyncVideoUrl != null &&
                posSeconds >= moment.timestamp &&
                posSeconds <= moment.timestamp + moment.duration &&
                moment.timestamp !in state.triggeredMomentTimestamps
        }
    }

    companion object {
        private const val ADMIN_ROLE = "admin"
        private const val INTERACTION_REWIND_THRESHOLD_S = 3.0
        private const val INTERACTION_SEEK_OFFSET_S = 5.0
        private const val MILLIS_PER_SECOND = 1000.0
    }
}

package tv.bayit.plus.feature.player.trivia

import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.common.logging.BayitLogger
import tv.bayit.plus.core.data.repository.TriviaRepository
import tv.bayit.plus.core.model.TriviaFact
import tv.bayit.plus.feature.player.live.LiveAIConfig
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Manages VOD trivia facts fetched via REST API and triggered by playback position.
 *
 * Timed facts appear within a window around their triggerTime. Untimed facts
 * are shown at regular intervals (matching iOS parity). Deduplication prevents
 * the same fact from appearing twice in a session.
 */
@Singleton
class VodTriviaManager @Inject constructor(
    private val triviaRepository: TriviaRepository,
    private val logger: BayitLogger,
) {
    private val _activeFact = MutableStateFlow<TriviaFact?>(null)
    val activeFact: StateFlow<TriviaFact?> = _activeFact.asStateFlow()

    private val _isEnabled = MutableStateFlow(true)
    val isEnabled: StateFlow<Boolean> = _isEnabled.asStateFlow()

    private val _language = MutableStateFlow("en")
    val language: StateFlow<String> = _language.asStateFlow()

    private var facts: List<TriviaFact> = emptyList()
    private var dismissJob: Job? = null
    private var currentContentId: String? = null
    private var lastUntimedShowTimeMs: Long = 0L

    private val shownFactIds = object : LinkedHashSet<String>() {
        override fun add(element: String): Boolean {
            if (size >= MAX_SHOWN_FACTS) {
                val iterator = iterator()
                if (iterator.hasNext()) {
                    iterator.next()
                    iterator.remove()
                }
            }
            return super.add(element)
        }
    }

    fun loadFacts(contentId: String, language: String, scope: CoroutineScope) {
        if (contentId == currentContentId && language == _language.value && facts.isNotEmpty()) return
        currentContentId = contentId
        _language.value = language

        scope.launch {
            logger.debug("Loading VOD trivia facts", mapOf(
                "contentId" to contentId,
                "language" to language,
            ))

            when (val result = triviaRepository.fetchTrivia(contentId, language)) {
                is BayitResult.Success -> {
                    facts = result.data.facts
                    logger.info("VOD trivia facts loaded", mapOf(
                        "count" to result.data.facts.size.toString(),
                    ))
                }
                is BayitResult.Error -> {
                    logger.error("Failed to load VOD trivia facts", result.exception)
                    facts = emptyList()
                }
                is BayitResult.Loading -> Unit
            }
        }
    }

    fun updatePlaybackPosition(positionMs: Long, scope: CoroutineScope) {
        if (!_isEnabled.value || facts.isEmpty()) return
        val positionSec = positionMs / 1000.0

        val timedFact = findTimedFact(positionSec)
        if (timedFact != null) {
            showFact(timedFact, scope)
            return
        }

        if (_activeFact.value == null && shouldShowUntimedFact(positionMs)) {
            val untimedFact = findUntimedFact()
            if (untimedFact != null) {
                lastUntimedShowTimeMs = positionMs
                showFact(untimedFact, scope)
            }
        }
    }

    fun dismissFact() {
        dismissJob?.cancel()
        _activeFact.value = null
    }

    fun requestFollowUp(scope: CoroutineScope) {
        val current = _activeFact.value ?: return
        val chainId = current.chainId ?: return
        val nextOrder = (current.chainOrder ?: 0) + 1

        val followUp = facts.find {
            it.chainId == chainId && it.chainOrder == nextOrder && it.id !in shownFactIds
        }
        if (followUp != null) {
            showFact(followUp, scope)
        }
    }

    fun toggleEnabled() {
        _isEnabled.value = !_isEnabled.value
        if (!_isEnabled.value) dismissFact()
    }

    fun cleanup() {
        dismissJob?.cancel()
        _activeFact.value = null
        facts = emptyList()
        shownFactIds.clear()
        currentContentId = null
        lastUntimedShowTimeMs = 0L
    }

    private fun findTimedFact(positionSec: Double): TriviaFact? {
        return facts.find { fact ->
            val triggerTime = fact.triggerTime ?: return@find false
            fact.id !in shownFactIds &&
                fact.id != _activeFact.value?.id &&
                positionSec >= (triggerTime - TIMED_WINDOW_SEC) &&
                positionSec <= (triggerTime + TIMED_WINDOW_SEC)
        }
    }

    private fun findUntimedFact(): TriviaFact? {
        return facts.find { fact ->
            fact.triggerTime == null && fact.id !in shownFactIds
        }
    }

    private fun shouldShowUntimedFact(positionMs: Long): Boolean {
        if (lastUntimedShowTimeMs == 0L) {
            return positionMs >= UNTIMED_INITIAL_DELAY_MS
        }
        return (positionMs - lastUntimedShowTimeMs) >= UNTIMED_INTERVAL_MS
    }

    private fun showFact(fact: TriviaFact, scope: CoroutineScope) {
        dismissJob?.cancel()
        shownFactIds.add(fact.id)
        _activeFact.value = fact

        val durationSec = fact.displayDuration
            ?: LiveAIConfig.TRIVIA_DEFAULT_DISPLAY_DURATION_SEC
        dismissJob = scope.launch {
            delay(durationSec * 1000L)
            if (_activeFact.value?.id == fact.id) {
                _activeFact.value = null
            }
        }
    }

    companion object {
        private const val MAX_SHOWN_FACTS = 1000
        private const val TIMED_WINDOW_SEC = 15.0
        private const val UNTIMED_INTERVAL_MS = 300_000L
        private const val UNTIMED_INITIAL_DELAY_MS = 300_000L
    }
}

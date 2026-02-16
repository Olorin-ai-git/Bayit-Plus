package tv.bayit.plus.feature.player.trivia

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
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
import javax.inject.Inject

/**
 * Manages trivia facts overlay during content playback.
 *
 * Loads facts from the API, tracks the currently active fact by playback time,
 * auto-dismisses after a configurable duration, and supports follow-up chain
 * requests for deeper exploration.
 */
@HiltViewModel
class TriviaFactsViewModel @Inject constructor(
    private val triviaRepository: TriviaRepository,
    private val logger: BayitLogger,
) : ViewModel() {

    private val _facts = MutableStateFlow<List<TriviaFact>>(emptyList())
    val facts: StateFlow<List<TriviaFact>> = _facts.asStateFlow()

    private val _activeFact = MutableStateFlow<TriviaFact?>(null)
    val activeFact: StateFlow<TriviaFact?> = _activeFact.asStateFlow()

    private val _isEnabled = MutableStateFlow(true)
    val isEnabled: StateFlow<Boolean> = _isEnabled.asStateFlow()

    private val _language = MutableStateFlow("en")
    val language: StateFlow<String> = _language.asStateFlow()

    private var dismissJob: Job? = null
    private var currentContentId: String? = null

    fun loadFacts(contentId: String, language: String) {
        currentContentId = contentId
        _language.value = language

        viewModelScope.launch {
            logger.debug("Loading trivia facts", mapOf(
                "contentId" to contentId,
                "language" to language,
            ))

            when (val result = triviaRepository.fetchTrivia(contentId, language)) {
                is BayitResult.Success -> {
                    _facts.value = result.data.facts
                    logger.info("Trivia facts loaded", mapOf(
                        "count" to result.data.facts.size.toString(),
                    ))
                }
                is BayitResult.Error -> {
                    logger.error("Failed to load trivia facts", result.exception)
                    _facts.value = emptyList()
                }
                is BayitResult.Loading -> Unit
            }
        }
    }

    fun updatePlaybackPosition(positionMs: Long) {
        if (!_isEnabled.value) return
        val positionSec = positionMs / 1000.0

        val triggered = _facts.value.find { fact ->
            val triggerTime = fact.triggerTime ?: return@find false
            val duration = fact.displayDuration ?: DEFAULT_DISPLAY_DURATION_SEC
            positionSec in triggerTime..(triggerTime + duration)
        }

        if (triggered != null && triggered.id != _activeFact.value?.id) {
            showFact(triggered)
        } else if (triggered == null && _activeFact.value != null) {
            _activeFact.value = null
        }
    }

    fun dismissFact() {
        dismissJob?.cancel()
        _activeFact.value = null
    }

    fun requestFollowUp() {
        val current = _activeFact.value ?: return
        val chainId = current.chainId ?: return
        val nextOrder = (current.chainOrder ?: 0) + 1

        val followUp = _facts.value.find {
            it.chainId == chainId && it.chainOrder == nextOrder
        }
        if (followUp != null) {
            showFact(followUp)
        }
    }

    fun toggleEnabled() {
        _isEnabled.value = !_isEnabled.value
        if (!_isEnabled.value) dismissFact()
    }

    fun setLanguage(language: String) {
        _language.value = language
        val contentId = currentContentId ?: return
        loadFacts(contentId, language)
    }

    fun handleLiveTriviaFact(fact: TriviaFact) {
        if (!_isEnabled.value) return
        showFact(fact)
    }

    private fun showFact(fact: TriviaFact) {
        dismissJob?.cancel()
        _activeFact.value = fact

        val duration = fact.displayDuration ?: DEFAULT_DISPLAY_DURATION_SEC
        dismissJob = viewModelScope.launch {
            delay(duration * 1000L)
            if (_activeFact.value?.id == fact.id) {
                _activeFact.value = null
            }
        }
    }

    companion object {
        private const val DEFAULT_DISPLAY_DURATION_SEC = 8
    }
}

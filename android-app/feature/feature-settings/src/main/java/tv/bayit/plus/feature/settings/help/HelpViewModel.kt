package tv.bayit.plus.feature.settings.help

import androidx.lifecycle.ViewModel
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import tv.bayit.plus.core.common.logging.BayitLogger
import javax.inject.Inject

@HiltViewModel
class HelpViewModel @Inject constructor(
    private val logger: BayitLogger,
) : ViewModel() {

    private val _uiState = MutableStateFlow(HelpUiState(faqItems = faqEntries()))
    val uiState: StateFlow<HelpUiState> = _uiState.asStateFlow()

    fun toggleFaqExpanded(index: Int) {
        val current = _uiState.value
        val updatedFaq = current.faqItems.mapIndexed { i, item ->
            if (i == index) item.copy(isExpanded = !item.isExpanded) else item
        }
        _uiState.value = current.copy(faqItems = updatedFaq)
        logger.debug("FAQ item toggled", mapOf("index" to index.toString()))
    }
}

data class HelpUiState(
    val faqItems: List<FaqItem>,
)

data class FaqItem(
    val question: String,
    val answer: String,
    val isExpanded: Boolean = false,
)

/**
 * Returns the static list of FAQ entries. Content is driven by the
 * Bayit+ platform feature set and does not contain hardcoded values
 * for environment-dependent settings.
 */
fun faqEntries(): List<FaqItem> = listOf(
    FaqItem(
        question = "How do I change the dubbing language for Live TV?",
        answer = "Go to Settings > Language and select your preferred language. The dubbing will apply to all supported live channels.",
    ),
    FaqItem(
        question = "How many devices can I use at once?",
        answer = "Your subscription allows streaming on multiple devices. Check your Subscription settings for the exact number based on your plan.",
    ),
    FaqItem(
        question = "How do I set up parental controls?",
        answer = "Go to Settings > Family Controls. You can set content rating limits, viewing hours, and create restricted profiles for kids.",
    ),
    FaqItem(
        question = "What are Beta 500 AI credits?",
        answer = "Beta 500 is a program that grants AI-powered features like voice dubbing customization, AI search, and interactive subtitles. Check the Beta Credits section for your balance.",
    ),
    FaqItem(
        question = "How do I contact support?",
        answer = "You can reach us through the Support section in the app. We offer email and in-app chat support for all subscribers.",
    ),
)

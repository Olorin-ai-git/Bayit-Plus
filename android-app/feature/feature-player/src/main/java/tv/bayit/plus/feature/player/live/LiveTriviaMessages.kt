package tv.bayit.plus.feature.player.live

import kotlinx.serialization.Serializable
import tv.bayit.plus.core.model.TriviaFact

/** WebSocket topic detection payload for live trivia. */
@Serializable
internal data class TriviaTopic(
    val topic: String? = null,
    val category: String? = null,
)

/** WebSocket message envelope for live trivia events. */
@Serializable
internal data class TriviaMessageWrapper(
    val type: String,
    val fact: TriviaFact? = null,
    val detectedTopic: TriviaTopic? = null,
    val message: String? = null,
)

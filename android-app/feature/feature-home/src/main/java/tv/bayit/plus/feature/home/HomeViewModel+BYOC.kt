package tv.bayit.plus.feature.home

import kotlinx.coroutines.flow.combine
import tv.bayit.plus.core.byoc.models.BYOCSourceType

internal suspend fun HomeViewModel.loadBYOCState() {
    try {
        sourceManager.sources.combine(sourceManager.contentItems) { sources, content ->
            sources to content
        }.collect { (sources, content) ->
            logger.debug(
                "BYOC state updated",
                mapOf(
                    "sourceCount" to sources.size.toString(),
                    "contentCount" to content.size.toString(),
                ),
            )
            val hasYouTube = sources.any { it.type == BYOCSourceType.YOUTUBE }
            updateState {
                copy(
                    byocSources = sources,
                    byocContent = content,
                    hasBYOCSources = sources.isNotEmpty(),
                    hasYouTubeSource = hasYouTube,
                )
            }
        }
    } catch (e: Exception) {
        logger.debug(
            "Failed to load BYOC state (non-blocking)",
            mapOf("error" to e.message.orEmpty()),
        )
    }
}

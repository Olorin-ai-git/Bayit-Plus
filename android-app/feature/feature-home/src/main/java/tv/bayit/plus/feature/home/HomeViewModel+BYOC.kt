package tv.bayit.plus.feature.home

import kotlinx.coroutines.flow.combine

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
            updateState {
                copy(
                    byocSources = sources,
                    byocContent = content,
                    hasBYOCSources = sources.isNotEmpty(),
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

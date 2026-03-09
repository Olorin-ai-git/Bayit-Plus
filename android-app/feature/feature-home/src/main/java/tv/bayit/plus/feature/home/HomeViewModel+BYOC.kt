package tv.bayit.plus.feature.home

import kotlinx.coroutines.flow.first

internal suspend fun HomeViewModel.loadBYOCState() {
    try {
        val sources = sourceManager.sources.first()
        val content = sourceManager.contentItems.first()
        val hasSources = sources.isNotEmpty()

        logger.debug(
            "BYOC state loaded",
            mapOf(
                "sourceCount" to sources.size.toString(),
                "contentCount" to content.size.toString(),
            ),
        )

        updateState {
            copy(
                byocSources = sources,
                byocContent = content,
                hasBYOCSources = hasSources,
            )
        }
    } catch (e: Exception) {
        logger.debug(
            "Failed to load BYOC state (non-blocking)",
            mapOf("error" to e.message.orEmpty()),
        )
    }
}

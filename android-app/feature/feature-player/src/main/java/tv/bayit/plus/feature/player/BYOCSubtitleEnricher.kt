package tv.bayit.plus.feature.player

import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.launch
import tv.bayit.plus.core.byoc.BYOCSourceManager
import tv.bayit.plus.core.byoc.enrichment.BYOCEnrichmentService
import tv.bayit.plus.core.byoc.models.BYOCContentType
import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.common.i18n.BayitStringProvider
import tv.bayit.plus.core.common.logging.BayitLogger
import javax.inject.Inject

/**
 * Enriches BYOC content with subtitles via the backend enrichment
 * endpoint (`POST /api/v1/byoc/enrich`). Uses the same pipeline as
 * the iOS app: upserts a Content document with title/year metadata,
 * then fetches subtitles from the Bayit library and OpenSubtitles.
 */
class BYOCSubtitleEnricher @Inject constructor(
    private val enrichmentService: BYOCEnrichmentService,
    private val sourceManager: BYOCSourceManager,
    private val stringProvider: BayitStringProvider,
    private val logger: BayitLogger,
) {
    fun enrichSubtitles(
        contentId: String,
        contentTitle: String,
        scope: CoroutineScope,
        onSubtitleAdded: (SubtitleAddedEvent) -> Unit,
        onLanguagesUpdated: (List<String>) -> Unit,
        onBackendContentId: (String) -> Unit,
        onComplete: (() -> Unit)? = null,
    ) {
        scope.launch {
            val item = sourceManager.contentItems.value.find { it.id == contentId }
            if (item == null) {
                logger.warning("BYOC enrichment: content item not found", mapOf("contentId" to contentId))
                onComplete?.invoke()
                return@launch
            }
            val sourceType = item.sourceType.name.lowercase()
            logger.info(
                "BYOC subtitle enrichment: starting",
                mapOf("contentId" to contentId, "title" to contentTitle, "sourceType" to sourceType),
            )
            when (val result = enrichmentService.enrich(
                externalId = contentId,
                title = contentTitle,
                sourceType = sourceType,
                year = item.year,
                durationSeconds = item.duration,
                imdbId = item.imdbId,
                tmdbId = item.tmdbId,
            )) {
                is BayitResult.Success -> {
                    val enrichResult = result.data
                    val backendId = enrichResult.contentId
                    onBackendContentId(backendId)
                    val langs = enrichResult.availableSubtitleLanguages
                    if (langs.isNotEmpty()) {
                        onLanguagesUpdated(langs)
                        val details = enrichResult.subtitleDetails
                        langs.forEach { lang ->
                            val detail = details[lang]
                            val langName = stringProvider.string("subtitles.language.$lang")
                            if (detail != null) {
                                onSubtitleAdded(SubtitleAddedEvent(langName, contentTitle))
                            }
                        }
                    }
                    logger.info(
                        "BYOC subtitle enrichment complete",
                        mapOf(
                            "contentId" to contentId,
                            "status" to enrichResult.enrichmentStatus,
                            "languages" to langs.joinToString(),
                        ),
                    )
                }
                is BayitResult.Error -> {
                    logger.error(
                        "BYOC subtitle enrichment failed",
                        result.exception,
                        mapOf("contentId" to contentId),
                    )
                }
                is BayitResult.Loading -> Unit
            }
            onComplete?.invoke()
        }
    }
}

data class SubtitleAddedEvent(
    val languageName: String,
    val contentTitle: String,
)

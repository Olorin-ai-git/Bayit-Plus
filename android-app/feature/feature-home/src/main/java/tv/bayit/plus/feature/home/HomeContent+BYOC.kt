package tv.bayit.plus.feature.home

import androidx.compose.foundation.lazy.LazyListScope
import tv.bayit.plus.core.byoc.BYOCSourceManager
import tv.bayit.plus.core.byoc.models.BYOCContentItem
import tv.bayit.plus.designsystem.i18n.bayitString

internal fun LazyListScope.byocHomeItems(
    uiState: HomeUiState.Success,
    sourceManager: BYOCSourceManager?,
    onConnectBYOCSources: () -> Unit,
    onBYOCItemClick: (BYOCContentItem) -> Unit,
    onBYOCSourceShowAll: (String) -> Unit,
) {
    if (!uiState.hasBYOCSources) {
        item(key = "byoc_onboarding") {
            BYOCOnboardingCard(onConnectSources = onConnectBYOCSources)
        }
    } else {
        val contentBySource = uiState.byocContent.groupBy { it.sourceId }
        uiState.byocSources.forEach { source ->
            val sourceItems = contentBySource[source.id].orEmpty()
            if (sourceItems.isNotEmpty()) {
                item(key = "byoc_content_${source.id}") {
                    BYOCContentRow(
                        sourceName = source.name,
                        items = sourceItems,
                        capabilities = sourceManager?.getCapabilities(source.id),
                        onItemClick = onBYOCItemClick,
                        onShowAll = { onBYOCSourceShowAll(source.id) },
                    )
                }
            }
        }
    }
}

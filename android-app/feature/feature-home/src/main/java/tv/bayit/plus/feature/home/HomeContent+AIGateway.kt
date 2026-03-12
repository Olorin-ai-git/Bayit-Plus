package tv.bayit.plus.feature.home

import androidx.compose.foundation.lazy.LazyListScope
import tv.bayit.plus.feature.byoc.AIGatewayCard
import tv.bayit.plus.feature.byoc.MoreContentCard

internal fun LazyListScope.aiGatewayItems(
    showAIGatewayCard: Boolean,
    showDontShowAgain: Boolean,
    onConnectYouTube: () -> Unit,
    onLearnMoreAIGateway: () -> Unit,
    onDismissAIGateway: () -> Unit,
    onDontShowAgainAIGateway: () -> Unit,
    showMoreContentCard: Boolean,
    onExploreMoreContent: () -> Unit,
    onDismissMoreContent: () -> Unit,
) {
    if (showAIGatewayCard) {
        item(key = "ai_gateway") {
            AIGatewayCard(
                onConnectYouTube = onConnectYouTube,
                onLearnMore = onLearnMoreAIGateway,
                onDismiss = onDismissAIGateway,
                showDontShowAgain = showDontShowAgain,
                onDontShowAgain = onDontShowAgainAIGateway,
            )
        }
    }

    if (showMoreContentCard) {
        item(key = "more_content") {
            MoreContentCard(
                onExplore = onExploreMoreContent,
                onDismiss = onDismissMoreContent,
            )
        }
    }
}

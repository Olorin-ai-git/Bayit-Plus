package tv.bayit.plus.feature.discover.walkthrough

import tv.bayit.plus.feature.discover.model.DiscoverFeature
import java.util.UUID

data class WalkthroughSession(
    val featureId: String,
    val sessionToken: String,
    val feature: DiscoverFeature,
) {
    companion object {
        fun create(feature: DiscoverFeature): WalkthroughSession =
            WalkthroughSession(
                featureId = feature.id,
                sessionToken = UUID.randomUUID().toString(),
                feature = feature,
            )
    }
}

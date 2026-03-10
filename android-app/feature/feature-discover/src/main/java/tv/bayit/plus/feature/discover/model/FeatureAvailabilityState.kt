package tv.bayit.plus.feature.discover.model

sealed class FeatureAvailabilityState {
    data object Ready : FeatureAvailabilityState()

    data class SetupNeeded(
        val missing: List<FeaturePrerequisite>,
    ) : FeatureAvailabilityState()

    data object PremiumRequired : FeatureAvailabilityState()

    data class NotAvailable(
        val reasonKey: String,
    ) : FeatureAvailabilityState()

    data class PlatformOnly(
        val platform: DiscoverPlatform,
    ) : FeatureAvailabilityState()

    val badgeColorName: String
        get() = when (this) {
            is Ready -> "green"
            is SetupNeeded -> "orange"
            is PremiumRequired -> "purple"
            is NotAvailable -> "gray"
            is PlatformOnly -> "blue"
        }

    val badgeLabelKey: String
        get() = when (this) {
            is Ready -> "discover.badge.ready"
            is SetupNeeded -> "discover.badge.setupNeeded"
            is PremiumRequired -> "discover.badge.premium"
            is NotAvailable -> "discover.badge.notAvailable"
            is PlatformOnly -> "discover.badge.platformOnly"
        }
}

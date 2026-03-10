package tv.bayit.plus.feature.discover.model

/**
 * Result of checking whether a [DiscoverFeature] is accessible to the current user.
 *
 * Mirrors the iOS `FeatureAvailabilityState` enum in BayitCore. The sealed hierarchy
 * allows exhaustive `when` expressions in the UI layer without defensive `else` branches.
 */
sealed class FeatureAvailabilityState {

    /** The feature is fully available with no further setup required. */
    data object Ready : FeatureAvailabilityState()

    /**
     * The feature is available but one or more prerequisites are not yet satisfied.
     *
     * @param missing Non-empty list of unmet [FeaturePrerequisite] items the user must complete.
     */
    data class SetupNeeded(val missing: List<FeaturePrerequisite>) : FeatureAvailabilityState()

    /** The feature requires a paid subscription that the current user does not have. */
    data object PremiumRequired : FeatureAvailabilityState()

    /**
     * The feature cannot be used in the current context (e.g. requires a specific content type
     * to be playing).
     *
     * @param reasonKey i18n key explaining why the feature is unavailable.
     */
    data class NotAvailable(val reasonKey: String) : FeatureAvailabilityState()

    /**
     * The feature exists only on a different platform.
     *
     * @param platform The platform on which the feature is supported.
     */
    data class PlatformOnly(val platform: DiscoverPlatform) : FeatureAvailabilityState()
}

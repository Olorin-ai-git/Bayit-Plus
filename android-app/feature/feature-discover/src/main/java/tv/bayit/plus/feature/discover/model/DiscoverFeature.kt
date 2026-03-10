package tv.bayit.plus.feature.discover.model

/**
 * A single AI feature surfaced on the Discover tab.
 *
 * Mirrors the iOS `DiscoverFeature` struct in BayitCore. Property names and string key
 * conventions are kept identical so that i18n keys and analytics event names are shared
 * across platforms without mapping.
 *
 * @param id               Stable, snake_case feature identifier (e.g. `"pause_ask"`).
 * @param category         Category this feature belongs to.
 * @param nameKey          i18n key for the short display name.
 * @param taglineKey       i18n key for the one-line marketing tagline.
 * @param descriptionKey   i18n key for the longer detail description.
 * @param iconName         Material icon name or vector asset key used by [discoverIcon].
 * @param platforms        Set of platforms on which this feature is available.
 * @param prerequisites    Ordered list of requirements the user must satisfy.
 * @param walkthroughSteps Ordered steps shown during the guided walkthrough.
 * @param deepLinkRoute    Deep-link URI string used to navigate into the feature, or null
 *                         when the feature has no standalone destination.
 */
data class DiscoverFeature(
    val id: String,
    val category: DiscoverCategory,
    val nameKey: String,
    val taglineKey: String,
    val descriptionKey: String,
    val iconName: String,
    val platforms: Set<DiscoverPlatform>,
    val prerequisites: List<FeaturePrerequisite>,
    val walkthroughSteps: List<WalkthroughStep>,
    val deepLinkRoute: String? = null,
)

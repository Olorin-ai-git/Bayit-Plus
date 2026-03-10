package tv.bayit.plus.feature.discover.model

/**
 * A prerequisite that must be satisfied before the user can fully use a [DiscoverFeature].
 *
 * Mirrors the iOS `FeaturePrerequisite` struct in BayitCore. Each instance carries a
 * human-readable [labelKey] for display and an optional [fixRoute] deep-link that takes
 * the user directly to the setup screen.
 *
 * @param id          Stable identifier used for equality and persistence.
 * @param type        Category of setup action required.
 * @param labelKey    i18n key shown in the setup-needed badge or prerequisite list.
 * @param fixRoute    Deep-link URI string to the remediation screen, if applicable.
 */
data class FeaturePrerequisite(
    val id: String,
    val type: PrerequisiteType,
    val labelKey: String,
    val fixRoute: String? = null,
) {
    /**
     * Category of setup requirement.
     *
     * Mirrors iOS `FeaturePrerequisite.PrerequisiteType`.
     */
    enum class PrerequisiteType {
        AVATAR,
        SUBSCRIPTION,
        MICROPHONE,
        CONTENT_TYPE,
        PREFERENCE,
        VOICE_CLONE,
    }
}

package tv.bayit.plus.feature.discover.data

/**
 * Abstraction over the external data sources needed to evaluate feature availability.
 *
 * Provided by [tv.bayit.plus.feature.discover.di.DiscoverProvidesModule] as a
 * singleton backed by real repository calls. Expressed as an interface so that
 * tests can supply deterministic answers without touching the network.
 *
 * Mirrors the iOS `FeatureAvailabilityDependencies` struct in BayitCore.
 */
interface AvailabilityDependencies {

    /**
     * Returns true when the current user has an active paid subscription.
     *
     * Used to gate features that require [tv.bayit.plus.feature.discover.model.FeaturePrerequisite.PrerequisiteType.SUBSCRIPTION].
     */
    suspend fun isPremium(): Boolean

    /**
     * Returns true when the current user has a completed Zeh-Ani avatar.
     *
     * Used to gate features that require [tv.bayit.plus.feature.discover.model.FeaturePrerequisite.PrerequisiteType.AVATAR].
     */
    suspend fun hasAvatar(): Boolean

    /**
     * Returns true when the RECORD_AUDIO runtime permission has been granted.
     *
     * Used to gate features that require [tv.bayit.plus.feature.discover.model.FeaturePrerequisite.PrerequisiteType.MICROPHONE].
     */
    suspend fun hasMicrophonePermission(): Boolean

    /**
     * Returns true when the user has completed the preference setup identified by [id].
     *
     * The [id] value corresponds to [tv.bayit.plus.feature.discover.model.FeaturePrerequisite.id]
     * for prerequisites of type [tv.bayit.plus.feature.discover.model.FeaturePrerequisite.PrerequisiteType.PREFERENCE].
     */
    suspend fun hasCompletedPreference(id: String): Boolean
}

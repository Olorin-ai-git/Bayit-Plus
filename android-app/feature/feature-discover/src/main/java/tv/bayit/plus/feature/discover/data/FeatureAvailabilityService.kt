package tv.bayit.plus.feature.discover.data

import tv.bayit.plus.feature.discover.model.DiscoverFeature
import tv.bayit.plus.feature.discover.model.DiscoverPlatform
import tv.bayit.plus.feature.discover.model.FeatureAvailabilityState
import tv.bayit.plus.feature.discover.model.FeaturePrerequisite
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Determines whether a [DiscoverFeature] is currently accessible to the user.
 *
 * Evaluation proceeds in this order, mirroring the iOS `FeatureAvailabilityService`:
 *
 * 1. Platform check — if [DiscoverPlatform.ANDROID] is not in [DiscoverFeature.platforms],
 *    returns [FeatureAvailabilityState.PlatformOnly] immediately.
 * 2. Prerequisites — iterates [DiscoverFeature.prerequisites] and:
 *    - A missing [FeaturePrerequisite.PrerequisiteType.SUBSCRIPTION] returns
 *      [FeatureAvailabilityState.PremiumRequired] immediately (hard gate).
 *    - A [FeaturePrerequisite.PrerequisiteType.CONTENT_TYPE] prerequisite returns
 *      [FeatureAvailabilityState.NotAvailable] immediately, because context-dependent
 *      features cannot be unlocked through setup actions.
 *    - All other unmet prerequisites are accumulated into the [missing] list.
 * 3. If [missing] is non-empty, returns [FeatureAvailabilityState.SetupNeeded].
 * 4. Otherwise returns [FeatureAvailabilityState.Ready].
 */
@Singleton
class FeatureAvailabilityService @Inject constructor(
    private val dependencies: AvailabilityDependencies,
) {

    /**
     * Evaluates [feature] against the current user state.
     *
     * Suspend functions in [dependencies] may make network requests; callers
     * should invoke this from a coroutine scope with an appropriate dispatcher.
     */
    suspend fun checkAvailability(feature: DiscoverFeature): FeatureAvailabilityState {
        if (DiscoverPlatform.ANDROID !in feature.platforms) {
            return platformOnlyState(feature.platforms)
        }

        val missing = mutableListOf<FeaturePrerequisite>()

        for (prerequisite in feature.prerequisites) {
            when (prerequisite.type) {
                FeaturePrerequisite.PrerequisiteType.SUBSCRIPTION -> {
                    if (!dependencies.isPremium()) {
                        return FeatureAvailabilityState.PremiumRequired
                    }
                }

                FeaturePrerequisite.PrerequisiteType.CONTENT_TYPE -> {
                    return FeatureAvailabilityState.NotAvailable(
                        reasonKey = prerequisite.labelKey,
                    )
                }

                FeaturePrerequisite.PrerequisiteType.AVATAR -> {
                    if (!dependencies.hasAvatar()) {
                        missing += prerequisite
                    }
                }

                FeaturePrerequisite.PrerequisiteType.MICROPHONE -> {
                    if (!dependencies.hasMicrophonePermission()) {
                        missing += prerequisite
                    }
                }

                FeaturePrerequisite.PrerequisiteType.PREFERENCE -> {
                    if (!dependencies.hasCompletedPreference(prerequisite.id)) {
                        missing += prerequisite
                    }
                }

                FeaturePrerequisite.PrerequisiteType.VOICE_CLONE -> {
                    if (!dependencies.hasAvatar()) {
                        missing += prerequisite
                    }
                }
            }
        }

        return if (missing.isNotEmpty()) {
            FeatureAvailabilityState.SetupNeeded(missing)
        } else {
            FeatureAvailabilityState.Ready
        }
    }

    private fun platformOnlyState(platforms: Set<DiscoverPlatform>): FeatureAvailabilityState {
        val representative = platforms.firstOrNull()
            ?: return FeatureAvailabilityState.NotAvailable(
                reasonKey = "discover.availability.noPlatform",
            )
        return FeatureAvailabilityState.PlatformOnly(representative)
    }
}

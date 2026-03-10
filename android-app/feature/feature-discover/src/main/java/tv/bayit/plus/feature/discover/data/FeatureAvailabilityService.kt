package tv.bayit.plus.feature.discover.data

import tv.bayit.plus.feature.discover.model.DiscoverFeature
import tv.bayit.plus.feature.discover.model.DiscoverPlatform
import tv.bayit.plus.feature.discover.model.FeatureAvailabilityState
import tv.bayit.plus.feature.discover.model.FeaturePrerequisite
import tv.bayit.plus.feature.discover.model.PrerequisiteType
import javax.inject.Inject
import javax.inject.Singleton

interface AvailabilityDependencies {
    suspend fun isPremium(): Boolean
    suspend fun hasAvatar(): Boolean
    suspend fun hasMicrophonePermission(): Boolean
    suspend fun hasCompletedPreference(id: String): Boolean
}

@Singleton
class FeatureAvailabilityService @Inject constructor(
    private val deps: AvailabilityDependencies,
) {
    suspend fun checkAvailability(
        feature: DiscoverFeature,
    ): FeatureAvailabilityState {
        if (DiscoverPlatform.ANDROID !in feature.platforms) {
            val required = feature.platforms.firstOrNull()
                ?: return FeatureAvailabilityState.NotAvailable("discover.availability.noPlatform")
            return FeatureAvailabilityState.PlatformOnly(required)
        }

        val missing = mutableListOf<FeaturePrerequisite>()

        for (prereq in feature.prerequisites) {
            when (prereq.type) {
                PrerequisiteType.SUBSCRIPTION -> {
                    if (!deps.isPremium()) return FeatureAvailabilityState.PremiumRequired
                }
                PrerequisiteType.CONTENT_TYPE -> {
                    return FeatureAvailabilityState.NotAvailable(prereq.labelKey)
                }
                PrerequisiteType.AVATAR, PrerequisiteType.VOICE_CLONE -> {
                    if (!deps.hasAvatar()) missing.add(prereq)
                }
                PrerequisiteType.MICROPHONE -> {
                    if (!deps.hasMicrophonePermission()) missing.add(prereq)
                }
                PrerequisiteType.PREFERENCE -> {
                    if (!deps.hasCompletedPreference(prereq.id)) missing.add(prereq)
                }
            }
        }

        return if (missing.isNotEmpty()) {
            FeatureAvailabilityState.SetupNeeded(missing)
        } else {
            FeatureAvailabilityState.Ready
        }
    }
}

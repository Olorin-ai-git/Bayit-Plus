package tv.bayit.plus.feature.discover.model

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

enum class DiscoverPlatform {
    IOS,
    TVOS,
    ANDROID,
}

data class FeaturePrerequisite(
    val id: String,
    val type: PrerequisiteType,
    val labelKey: String,
    val fixRoute: String? = null,
)

enum class PrerequisiteType {
    AVATAR,
    SUBSCRIPTION,
    MICROPHONE,
    CONTENT_TYPE,
    PREFERENCE,
    VOICE_CLONE,
}

data class WalkthroughStep(
    val id: String,
    val instructionKey: String,
    val targetAccessibilityId: String,
    val expectedAction: WalkthroughAction,
    val order: Int,
)

enum class WalkthroughAction {
    TAP,
    NAVIGATE,
    PAUSE,
    SELECT,
    TYPE,
    OBSERVE,
    CREATE_AVATAR,
}

package tv.bayit.plus.feature.discover.model

/**
 * A single step in a feature walkthrough sequence.
 *
 * Mirrors the iOS `WalkthroughStep` struct in BayitCore. The [targetAccessibilityId]
 * is used by [tv.bayit.plus.feature.discover.ui.coachmark.WalkthroughTargetModifier] to
 * locate the composable node that the spotlight should highlight.
 *
 * @param id                    Stable step identifier of the form `{featureId}_step{n}`.
 * @param instructionKey        i18n key for the instruction text displayed in the coach mark card.
 * @param targetAccessibilityId Accessibility content description used to look up the spotlight target.
 * @param expectedAction        The interaction the user is expected to perform.
 * @param order                 1-based position of this step within the walkthrough.
 * @param prerequisiteType      Optional prerequisite type string (e.g. "avatar") associated with this step.
 */
data class WalkthroughStep(
    val id: String,
    val instructionKey: String,
    val targetAccessibilityId: String,
    val expectedAction: WalkthroughAction,
    val order: Int,
    val prerequisiteType: String? = null,
)

/**
 * Interaction types a walkthrough step can require from the user.
 *
 * Mirrors iOS `WalkthroughAction` in BayitCore.
 */
enum class WalkthroughAction {
    TAP,
    NAVIGATE,
    PAUSE,
    SELECT,
    TYPE,
    OBSERVE,
    CREATE_AVATAR,
}

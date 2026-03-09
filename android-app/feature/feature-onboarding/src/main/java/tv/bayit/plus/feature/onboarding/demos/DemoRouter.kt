// # DEMO-ONLY
package tv.bayit.plus.feature.onboarding.demos

import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier

/**
 * Routes a featureKey to the correct demo composable.
 * Called from FeatureCardComposable's "Try It Now" button.
 *
 * Feature keys match FeatureCard.featureKey values defined in
 * [tv.bayit.plus.feature.onboarding.buildFeatureCards].
 */
@Composable
fun DemoRouter(
    featureKey: String,
    onClose: () -> Unit,
    modifier: Modifier = Modifier,
) {
    when (featureKey) {
        FeatureKeys.LIVE_DUBBING -> DubbingDemoComposable(
            onClose = onClose,
            modifier = modifier,
        )
        FeatureKeys.LIVE_TRIVIA -> TriviaDemoComposable(
            onClose = onClose,
            modifier = modifier,
        )
        FeatureKeys.SUBTITLES_SPLIT,
        FeatureKeys.ENGREW_HEBLISH,
        -> SubtitleDemoComposable(
            onClose = onClose,
            modifier = modifier,
        )
        FeatureKeys.PAUSE_AND_ASK,
        FeatureKeys.MOVIE_INTERACTION,
        -> InteractionDemoComposable(
            onClose = onClose,
            modifier = modifier,
        )
        FeatureKeys.ZEH_ANI -> ZehAniDemoComposable(
            onClose = onClose,
            modifier = modifier,
        )
        FeatureKeys.CATCHUP -> CatchupDemoComposable(
            onClose = onClose,
            modifier = modifier,
        )
        FeatureKeys.BYOC -> BYOCDemoComposable(
            onClose = onClose,
            modifier = modifier,
        )
    }
}

/**
 * Constants matching the featureKey values from [tv.bayit.plus.feature.onboarding.FeatureCard].
 */
internal object FeatureKeys {
    const val LIVE_DUBBING = "live_dubbing"
    const val LIVE_TRIVIA = "live_trivia"
    const val SUBTITLES_SPLIT = "subtitles_split"
    const val ENGREW_HEBLISH = "engrew_heblish"
    const val PAUSE_AND_ASK = "pause_and_ask"
    const val MOVIE_INTERACTION = "movie_interaction"
    const val ZEH_ANI = "zeh_ani"
    const val CATCHUP = "catchup"
    const val BYOC = "byoc"
}

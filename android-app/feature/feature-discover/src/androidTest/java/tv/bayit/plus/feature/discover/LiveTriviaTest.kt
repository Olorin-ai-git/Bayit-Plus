package tv.bayit.plus.feature.discover

import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.hasText
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.performClick
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import tv.bayit.plus.feature.discover.model.DiscoverFeatureCatalog
import tv.bayit.plus.feature.discover.model.DiscoverPlatform
import tv.bayit.plus.feature.discover.model.FeatureAvailabilityState
import tv.bayit.plus.feature.discover.ui.DiscoverFeatureDetailSheet

@RunWith(AndroidJUnit4::class)
class LiveTriviaTest {

    @get:Rule
    val composeTestRule = createComposeRule()

    private val feature = DiscoverFeatureCatalog.featureById("live_trivia")!!

    @Test
    fun liveTrivia_isOnAndroid() {
        assert(DiscoverPlatform.ANDROID in feature.platforms)
    }

    @Test
    fun liveTrivia_notAvailable_contentType_badgeShown() {
        composeTestRule.setContent {
            DiscoverFeatureDetailSheet(
                feature = feature,
                availability = FeatureAvailabilityState.NotAvailable("discover.prereq.contentType"),
                config = null,
                onDismiss = {},
                onStartWalkthrough = {},
                onNavigateToPlayer = { _, _ -> },
                onNavigateToZehAni = {},
            )
        }

        composeTestRule
            .onNode(hasText("discover.availability.notAvailable", substring = true, ignoreCase = true))
            .assertIsDisplayed()
    }

    @Test
    fun liveTrivia_detailSheet_displaysDescription() {
        composeTestRule.setContent {
            DiscoverFeatureDetailSheet(
                feature = feature,
                availability = FeatureAvailabilityState.Ready,
                config = null,
                onDismiss = {},
                onStartWalkthrough = {},
                onNavigateToPlayer = { _, _ -> },
                onNavigateToZehAni = {},
            )
        }

        composeTestRule
            .onNode(hasText(feature.descriptionKey, substring = true, ignoreCase = true))
            .assertIsDisplayed()
    }

    @Test
    fun liveTrivia_ready_walkthroughButton_fires() {
        var started = false

        composeTestRule.setContent {
            DiscoverFeatureDetailSheet(
                feature = feature,
                availability = FeatureAvailabilityState.Ready,
                config = null,
                onDismiss = {},
                onStartWalkthrough = { started = true },
                onNavigateToPlayer = { _, _ -> },
                onNavigateToZehAni = {},
            )
        }

        composeTestRule
            .onNode(hasText("discover.walkthrough.tryItNow", substring = true, ignoreCase = true))
            .performClick()

        assertTrue(started)
    }
}

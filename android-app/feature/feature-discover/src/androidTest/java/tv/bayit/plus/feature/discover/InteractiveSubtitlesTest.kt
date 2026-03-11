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
import tv.bayit.plus.feature.discover.model.FeatureAvailabilityState
import tv.bayit.plus.feature.discover.model.FeaturePrerequisite
import tv.bayit.plus.feature.discover.ui.DiscoverFeatureDetailSheet

@RunWith(AndroidJUnit4::class)
class InteractiveSubtitlesTest {

    @get:Rule
    val composeTestRule = createComposeRule()

    private val feature = DiscoverFeatureCatalog.featureById("interactive_subtitles")!!

    @Test
    fun interactiveSubtitles_detailSheet_displaysDescription() {
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
    fun interactiveSubtitles_setupNeeded_showsPreferencePrerequisite() {
        val missing = listOf(
            FeaturePrerequisite(
                id = "interactive_subtitles_preference",
                type = FeaturePrerequisite.PrerequisiteType.PREFERENCE,
                labelKey = "discover.prereq.preference",
                fixRoute = "bayitplus://settings/subtitles",
            ),
        )

        composeTestRule.setContent {
            DiscoverFeatureDetailSheet(
                feature = feature,
                availability = FeatureAvailabilityState.SetupNeeded(missing),
                config = null,
                onDismiss = {},
                onStartWalkthrough = {},
                onNavigateToPlayer = { _, _ -> },
                onNavigateToZehAni = {},
            )
        }

        composeTestRule
            .onNode(hasText("discover.prereq.preference", substring = true, ignoreCase = true))
            .assertIsDisplayed()
    }

    @Test
    fun interactiveSubtitles_ready_walkthroughButtonVisible() {
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
            .onNode(hasText("discover.walkthrough.tryItNow", substring = true, ignoreCase = true))
            .assertIsDisplayed()
    }

    @Test
    fun interactiveSubtitles_walkthroughButton_firesCallback() {
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

package tv.bayit.plus.feature.onboarding

import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.hasContentDescription
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.performClick
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class FeatureTourScreenTest {

    @get:Rule
    val composeTestRule = createComposeRule()

    private val testCards = listOf(
        FeatureCard("live_dubbing", 1, DemoType.VIDEO_TOGGLE, R.string.tour_card_live_dubbing_title, R.string.tour_card_live_dubbing_tagline),
        FeatureCard("live_trivia", 2, DemoType.VIDEO_TOGGLE, R.string.tour_card_live_trivia_title, R.string.tour_card_live_trivia_tagline),
        FeatureCard("byoc", 9, DemoType.STEP_ANIMATION, R.string.tour_card_byoc_title, R.string.tour_card_byoc_tagline),
    )

    @Test
    fun featureTourScreen_displaysSkipButton() {
        composeTestRule.setContent {
            FeatureTourScreen(
                cards = testCards,
                currentIndex = 0,
                onPageChanged = {},
                onTryItNow = {},
                onSkip = {},
                onGetStarted = {},
            )
        }

        composeTestRule
            .onNode(hasContentDescription("Skip the feature tour"))
            .assertIsDisplayed()
    }

    @Test
    fun featureTourScreen_skipButtonCallsOnSkip() {
        var skipped = false
        composeTestRule.setContent {
            FeatureTourScreen(
                cards = testCards,
                currentIndex = 0,
                onPageChanged = {},
                onTryItNow = {},
                onSkip = { skipped = true },
                onGetStarted = {},
            )
        }

        composeTestRule
            .onNode(hasContentDescription("Skip the feature tour"))
            .performClick()

        assertTrue(skipped)
    }

    @Test
    fun featureTourScreen_lastPageShowsGetStarted() {
        composeTestRule.setContent {
            FeatureTourScreen(
                cards = testCards,
                currentIndex = testCards.lastIndex,
                onPageChanged = {},
                onTryItNow = {},
                onSkip = {},
                onGetStarted = {},
            )
        }

        composeTestRule
            .onNode(hasContentDescription("Finish tour and get started"))
            .assertIsDisplayed()
    }

    @Test
    fun featureTourScreen_getStartedCallsCallback() {
        var started = false
        composeTestRule.setContent {
            FeatureTourScreen(
                cards = testCards,
                currentIndex = testCards.lastIndex,
                onPageChanged = {},
                onTryItNow = {},
                onSkip = {},
                onGetStarted = { started = true },
            )
        }

        composeTestRule
            .onNode(hasContentDescription("Finish tour and get started"))
            .performClick()

        assertTrue(started)
    }

    @Test
    fun featureTourScreen_progressBarIsDisplayed() {
        composeTestRule.setContent {
            FeatureTourScreen(
                cards = testCards,
                currentIndex = 0,
                onPageChanged = {},
                onTryItNow = {},
                onSkip = {},
                onGetStarted = {},
            )
        }

        composeTestRule
            .onNode(hasContentDescription("Card 1 of 3"))
            .assertIsDisplayed()
    }
}

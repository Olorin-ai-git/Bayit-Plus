package tv.bayit.plus.feature.onboarding

import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.hasText
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class PersonalizationStepTest {

    @get:Rule
    val composeTestRule = createComposeRule()

    @Test
    fun personalizationStep_displaysLanguageSection() {
        composeTestRule.setContent {
            PersonalizationStepComposable(onDone = { _, _, _ -> })
        }

        composeTestRule
            .onNode(hasText("English", substring = true))
            .assertIsDisplayed()
    }

    @Test
    fun personalizationStep_displaysGenreSection() {
        composeTestRule.setContent {
            PersonalizationStepComposable(onDone = { _, _, _ -> })
        }

        composeTestRule
            .onNode(hasText("Drama", substring = true, ignoreCase = true))
            .assertIsDisplayed()
    }

    @Test
    fun personalizationStep_doneCallbackFires() {
        var doneCalled = false
        composeTestRule.setContent {
            PersonalizationStepComposable(
                onDone = { languages, genres, hasChildren ->
                    doneCalled = true
                },
            )
        }

        composeTestRule
            .onNode(hasText("Done", substring = true, ignoreCase = true))
            .performClick()

        assertTrue(doneCalled)
    }
}
